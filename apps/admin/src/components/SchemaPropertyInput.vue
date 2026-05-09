<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { type SchemaTermSummary, useSchemaOrg } from '../composables/useSchemaOrg'
import type { SchemaOrgItem, SchemaOrgValue } from '@hanano/validator'

// Recursive: SchemaPropertyInput → SchemaItemEditor → SchemaPropertyInput
const SchemaItemEditor = defineAsyncComponent(() => import('./SchemaItemEditor.vue'))

const props = defineProps<{
  modelValue: SchemaOrgValue
  ranges: string[]
  propertyLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SchemaOrgValue]
}>()

const { classifyRange, isEnumerationClass, getEnumerationMembers } = useSchemaOrg()

const isArrayValue = computed(() => Array.isArray(props.modelValue))

const safeRanges = computed(() => (props.ranges.length > 0 ? props.ranges : ['schema:Text']))

const activeRange = ref<string>(safeRanges.value[0]!)

watch(
  safeRanges,
  (next) => {
    if (!next.includes(activeRange.value)) activeRange.value = next[0]!
  },
  { immediate: true },
)

const activeKind = computed(() => classifyRange(activeRange.value))

// Enumeration members cache for the active range when it's an enumeration
const enumMembers = ref<SchemaTermSummary[]>([])
const isEnumRange = ref(false)

async function refreshEnumState() {
  if (activeKind.value !== 'class') {
    isEnumRange.value = false
    enumMembers.value = []
    return
  }
  isEnumRange.value = await isEnumerationClass(activeRange.value)
  if (isEnumRange.value) {
    enumMembers.value = await getEnumerationMembers(activeRange.value)
  } else {
    enumMembers.value = []
  }
}

watch(activeRange, refreshEnumState)
onMounted(refreshEnumState)

function defaultValueForRange(range: string): SchemaOrgValue {
  switch (classifyRange(range)) {
    case 'boolean':
      return false
    case 'integer':
    case 'number':
      return ''
    case 'class':
      // Will be set to {} for nested item or '' for enum once we know
      return { '@type': range.replace(/^schema:/, '') } as SchemaOrgItem
    default:
      return ''
  }
}

function updateSingle(value: SchemaOrgValue) {
  emit('update:modelValue', value)
}

function updateAt(index: number, value: SchemaOrgValue) {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  arr[index] = value as never
  emit('update:modelValue', arr as SchemaOrgValue)
}

function addArrayItem() {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  arr.push(defaultValueForRange(activeRange.value) as never)
  emit('update:modelValue', arr as SchemaOrgValue)
}

function removeArrayItem(index: number) {
  if (!Array.isArray(props.modelValue)) return
  const arr = [...props.modelValue]
  arr.splice(index, 1)
  emit('update:modelValue', arr as SchemaOrgValue)
}

function toArrayMode() {
  const current = props.modelValue
  const seed =
    current === undefined || current === null || current === ''
      ? []
      : Array.isArray(current)
        ? current
        : [current]
  emit('update:modelValue', seed as SchemaOrgValue)
}

function toSingleMode() {
  if (!Array.isArray(props.modelValue)) return
  const first = props.modelValue[0]
  emit('update:modelValue', (first ?? '') as SchemaOrgValue)
}

function changeRange(newRange: string) {
  activeRange.value = newRange
  // Reset value to a sensible default when range changes
  if (Array.isArray(props.modelValue)) {
    emit('update:modelValue', [] as SchemaOrgValue)
  } else {
    emit('update:modelValue', defaultValueForRange(newRange))
  }
}

function asString(v: SchemaOrgValue): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'object') return ''
  return String(v)
}

function asBoolean(v: SchemaOrgValue): boolean {
  return v === true
}

function asItem(v: SchemaOrgValue): SchemaOrgItem {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as SchemaOrgItem
  return { '@type': activeRange.value.replace(/^schema:/, '') }
}
</script>

<template>
  <div class="property-input">
    <div class="prop-toolbar">
      <select
        v-if="safeRanges.length > 1"
        class="range-select"
        :value="activeRange"
        @change="changeRange(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="r in safeRanges" :key="r" :value="r">{{ r }}</option>
      </select>
      <span v-else class="range-static">{{ activeRange }}</span>

      <button
        v-if="!isArrayValue"
        type="button"
        class="mode-btn"
        title="Convert to array"
        @click="toArrayMode"
      >
        + array
      </button>
      <button
        v-else
        type="button"
        class="mode-btn"
        title="Convert to single value"
        @click="toSingleMode"
      >
        − array
      </button>
    </div>

    <!-- Array mode -->
    <div v-if="isArrayValue" class="array-list">
      <div
        v-for="(item, index) in (modelValue as SchemaOrgValue[])"
        :key="index"
        class="array-item"
      >
        <div class="array-item-body">
          <!-- Reuse same structure for each item via inline rendering -->
          <template v-if="isEnumRange">
            <select
              :value="asString(item)"
              class="ctrl"
              @change="updateAt(index, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">— select —</option>
              <option v-for="m in enumMembers" :key="m.iri" :value="m.iri">{{ m.label }}</option>
            </select>
          </template>
          <template v-else-if="activeKind === 'class'">
            <div class="nested-wrapper">
              <div class="nested-header">
                <span class="nested-badge">↳ nested</span>
                <span class="nested-type">{{ activeRange }}</span>
              </div>
              <div class="nested-body">
                <SchemaItemEditor
                  :model-value="asItem(item)"
                  :locked-class-iri="activeRange"
                  @update:model-value="updateAt(index, $event)"
                />
              </div>
            </div>
          </template>
          <template v-else-if="activeKind === 'boolean'">
            <label class="bool">
              <input
                type="checkbox"
                :checked="asBoolean(item)"
                @change="updateAt(index, ($event.target as HTMLInputElement).checked)"
              />
              <span>{{ asBoolean(item) ? 'true' : 'false' }}</span>
            </label>
          </template>
          <template v-else-if="activeKind === 'integer' || activeKind === 'number'">
            <input
              type="number"
              :step="activeKind === 'integer' ? 1 : 'any'"
              class="ctrl"
              :value="asString(item)"
              @input="updateAt(index, ($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value))"
            />
          </template>
          <template v-else-if="activeKind === 'date'">
            <input type="date" class="ctrl" :value="asString(item)" @input="updateAt(index, ($event.target as HTMLInputElement).value)" />
          </template>
          <template v-else-if="activeKind === 'datetime'">
            <input type="datetime-local" class="ctrl" :value="asString(item)" @input="updateAt(index, ($event.target as HTMLInputElement).value)" />
          </template>
          <template v-else-if="activeKind === 'time'">
            <input type="time" class="ctrl" :value="asString(item)" @input="updateAt(index, ($event.target as HTMLInputElement).value)" />
          </template>
          <template v-else-if="activeKind === 'url'">
            <input type="url" class="ctrl" placeholder="https://…" :value="asString(item)" @input="updateAt(index, ($event.target as HTMLInputElement).value)" />
          </template>
          <template v-else>
            <input type="text" class="ctrl" :value="asString(item)" @input="updateAt(index, ($event.target as HTMLInputElement).value)" />
          </template>
        </div>
        <button type="button" class="remove-array" title="Remove" @click="removeArrayItem(index)">×</button>
      </div>
      <button type="button" class="add-array" @click="addArrayItem">+ Add value</button>
    </div>

    <!-- Single value mode -->
    <div v-else class="single-value">
      <template v-if="isEnumRange">
        <select
          :value="asString(modelValue)"
          class="ctrl"
          @change="updateSingle(($event.target as HTMLSelectElement).value)"
        >
          <option value="">— select —</option>
          <option v-for="m in enumMembers" :key="m.iri" :value="m.iri">{{ m.label }}</option>
        </select>
      </template>
      <template v-else-if="activeKind === 'class'">
        <div class="nested-wrapper">
          <div class="nested-header">
            <span class="nested-badge">↳ nested</span>
            <span class="nested-type">{{ activeRange }}</span>
          </div>
          <div class="nested-body">
            <SchemaItemEditor
              :model-value="asItem(modelValue)"
              :locked-class-iri="activeRange"
              @update:model-value="updateSingle($event)"
            />
          </div>
        </div>
      </template>
      <template v-else-if="activeKind === 'boolean'">
        <label class="bool">
          <input
            type="checkbox"
            :checked="asBoolean(modelValue)"
            @change="updateSingle(($event.target as HTMLInputElement).checked)"
          />
          <span>{{ asBoolean(modelValue) ? 'true' : 'false' }}</span>
        </label>
      </template>
      <template v-else-if="activeKind === 'integer' || activeKind === 'number'">
        <input
          type="number"
          :step="activeKind === 'integer' ? 1 : 'any'"
          class="ctrl"
          :value="asString(modelValue)"
          @input="updateSingle(($event.target as HTMLInputElement).value === '' ? '' : Number(($event.target as HTMLInputElement).value))"
        />
      </template>
      <template v-else-if="activeKind === 'date'">
        <input type="date" class="ctrl" :value="asString(modelValue)" @input="updateSingle(($event.target as HTMLInputElement).value)" />
      </template>
      <template v-else-if="activeKind === 'datetime'">
        <input type="datetime-local" class="ctrl" :value="asString(modelValue)" @input="updateSingle(($event.target as HTMLInputElement).value)" />
      </template>
      <template v-else-if="activeKind === 'time'">
        <input type="time" class="ctrl" :value="asString(modelValue)" @input="updateSingle(($event.target as HTMLInputElement).value)" />
      </template>
      <template v-else-if="activeKind === 'url'">
        <input type="url" class="ctrl" placeholder="https://…" :value="asString(modelValue)" @input="updateSingle(($event.target as HTMLInputElement).value)" />
      </template>
      <template v-else>
        <input type="text" class="ctrl" :value="asString(modelValue)" @input="updateSingle(($event.target as HTMLInputElement).value)" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.property-input { display: flex; flex-direction: column; gap: 0.4rem; }

.prop-toolbar { display: flex; align-items: center; gap: 0.4rem; }
.range-select, .range-static {
  font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 4px;
  background: #f3f4f6; color: #374151; font-family: ui-monospace, monospace;
  border: 1px solid #e5e7eb;
}
.range-select { cursor: pointer; }
.mode-btn {
  font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px;
  background: #fff; border: 1px solid #d1d5db; color: #374151; cursor: pointer;
}
.mode-btn:hover { background: #f3f4f6; }

.ctrl {
  width: 100%; padding: 0.45rem 0.6rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem; outline: none; background: #fff;
}
.ctrl:focus { border-color: #1a56db; box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }

.bool { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; cursor: pointer; }

.array-list { display: flex; flex-direction: column; gap: 0.4rem; }
.array-item { display: flex; align-items: flex-start; gap: 0.35rem; }
.array-item-body { flex: 1; min-width: 0; }
.remove-array {
  flex-shrink: 0; width: 1.6rem; height: 1.6rem; padding: 0;
  border-radius: 50%; border: 1px solid #fecaca; background: #fff; color: #dc2626;
  cursor: pointer; font-size: 1rem; line-height: 1; margin-top: 0.3rem;
}
.remove-array:hover { background: #fef2f2; }

.add-array {
  align-self: flex-start; padding: 0.3rem 0.6rem; font-size: 0.8rem;
  background: #fff; border: 1px dashed #cbd5e0; color: #1a56db;
  border-radius: 6px; cursor: pointer;
}
.add-array:hover { background: #eef4ff; }

.nested-wrapper {
  border-left: 3px solid #93c5fd;
  background: #f8fafc;
  border-radius: 0 6px 6px 0;
  margin-left: 0.25rem;
  overflow: hidden;
}
.nested-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: #eff6ff;
  border-bottom: 1px solid #dbeafe;
}
.nested-badge {
  font-size: 0.65rem; font-weight: 600; color: #1d4ed8;
  background: #dbeafe; padding: 0.1rem 0.4rem; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.nested-type {
  font-size: 0.7rem; color: #1e40af;
  font-family: ui-monospace, monospace;
}
.nested-body {
  padding: 0.55rem 0.6rem;
}
</style>
