<script setup lang="ts">
import type { SchemaOrgItem, SchemaOrgValue } from '@hanano/validator'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { type SchemaPropertyInfo, useSchemaOrg } from '../composables/useSchemaOrg'
import SchemaClassPicker from './SchemaClassPicker.vue'
import SchemaPropertyPicker from './SchemaPropertyPicker.vue'

const SchemaPropertyInput = defineAsyncComponent(() => import('./SchemaPropertyInput.vue'))

const props = defineProps<{
  modelValue: SchemaOrgItem
  /** When set, the @type is fixed and the class picker is hidden */
  lockedClassIri?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SchemaOrgItem]
}>()

const { getPropertiesForClass } = useSchemaOrg()

const classIri = computed(() => {
  if (props.lockedClassIri) return props.lockedClassIri
  const t = props.modelValue['@type']
  if (!t) return ''
  // @type is the bare label, e.g. "Article". Convert to "schema:Article"
  if (typeof t === 'string') {
    return t.startsWith('schema:') ? t : `schema:${t}`
  }
  return ''
})

const propertyDetails = ref<Map<string, SchemaPropertyInfo>>(new Map())

async function loadDetails() {
  if (!classIri.value) {
    propertyDetails.value = new Map()
    return
  }
  const props_ = await getPropertiesForClass(classIri.value)
  const map = new Map<string, SchemaPropertyInfo>()
  for (const p of props_) {
    // Strip "schema:" prefix to use as JSON-LD key
    const key = p.iri.replace(/^schema:/, '')
    map.set(key, p)
  }
  propertyDetails.value = map
}

watch(classIri, loadDetails, { immediate: true })

const propertyKeys = computed(() => {
  return Object.keys(props.modelValue).filter((k) => k !== '@type' && k !== '@id')
})

const usedPropertyIris = computed(() =>
  propertyKeys.value.map((k) => `schema:${k}`),
)

function updateClass(newIri: string) {
  // Reset properties when class changes; keep @id if any
  const next: SchemaOrgItem = {
    '@type': newIri.replace(/^schema:/, '') || 'Thing',
  }
  if (props.modelValue['@id']) next['@id'] = props.modelValue['@id']
  emit('update:modelValue', next)
}

function updateId(newId: string) {
  const next: SchemaOrgItem = { ...props.modelValue }
  if (newId) next['@id'] = newId
  else delete next['@id']
  emit('update:modelValue', next)
}

function addProperty(prop: SchemaPropertyInfo) {
  const key = prop.iri.replace(/^schema:/, '')
  if (key in props.modelValue) return
  const next: SchemaOrgItem = { ...props.modelValue, [key]: '' }
  emit('update:modelValue', next)
}

function updateProperty(key: string, value: SchemaOrgValue) {
  const next: SchemaOrgItem = { ...props.modelValue, [key]: value }
  emit('update:modelValue', next)
}

function removeProperty(key: string) {
  const next: SchemaOrgItem = { ...props.modelValue }
  delete next[key]
  emit('update:modelValue', next)
}

function getPropertyRanges(key: string): string[] {
  return propertyDetails.value.get(key)?.ranges ?? ['schema:Text']
}

function getPropertyLabel(key: string): string {
  return propertyDetails.value.get(key)?.label ?? key
}
</script>

<template>
  <div class="schema-item-editor">
    <div v-if="!lockedClassIri" class="item-row">
      <label class="row-label">Type</label>
      <SchemaClassPicker
        :model-value="classIri"
        placeholder="Select Schema.org class…"
        @update:model-value="updateClass"
      />
    </div>
    <div v-else class="item-row locked">
      <label class="row-label">Type</label>
      <div class="locked-type">{{ lockedClassIri }}</div>
    </div>

    <div v-if="classIri" class="item-row">
      <label class="row-label">@id (optional)</label>
      <input
        type="text"
        class="ctrl"
        placeholder="https://example.com/#thing"
        :value="modelValue['@id'] ?? ''"
        @input="updateId(($event.target as HTMLInputElement).value)"
      />
    </div>

    <div v-if="classIri" class="properties">
      <div v-for="key in propertyKeys" :key="key" class="property">
        <div class="property-header">
          <div class="property-label">
            <span class="prop-name">{{ getPropertyLabel(key) }}</span>
            <span class="prop-key">{{ key }}</span>
          </div>
          <button type="button" class="remove-prop" title="Remove" @click="removeProperty(key)">×</button>
        </div>
        <SchemaPropertyInput
          :model-value="modelValue[key]"
          :ranges="getPropertyRanges(key)"
          :property-label="getPropertyLabel(key)"
          @update:model-value="updateProperty(key, $event)"
        />
      </div>

      <SchemaPropertyPicker
        :class-iri="classIri"
        :used-properties="usedPropertyIris"
        @select="addProperty"
      />
    </div>
  </div>
</template>

<style scoped>
.schema-item-editor {
  display: flex; flex-direction: column; gap: 0.6rem;
  padding: 0.6rem; border: 1px solid #e5e7eb; border-radius: 8px; background: #fafbfc;
}

.item-row { display: flex; flex-direction: column; gap: 0.25rem; }
.row-label { font-size: 0.75rem; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.02em; }

.locked-type {
  padding: 0.4rem 0.6rem; background: #f3f4f6; border-radius: 6px;
  font-family: ui-monospace, monospace; font-size: 0.85rem; color: #374151;
}

.ctrl {
  width: 100%; padding: 0.45rem 0.6rem; border: 1px solid #d1d5db;
  border-radius: 6px; font-size: 0.9rem; outline: none; background: #fff;
}
.ctrl:focus { border-color: #1a56db; box-shadow: 0 0 0 3px rgba(26,86,219,0.1); }

.properties { display: flex; flex-direction: column; gap: 0.5rem; }

.property {
  display: flex; flex-direction: column; gap: 0.3rem;
  padding: 0.5rem; background: #fff; border: 1px solid #f0f0f0; border-radius: 6px;
}
.property-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.property-label { display: flex; align-items: baseline; gap: 0.4rem; min-width: 0; flex-wrap: wrap; }
.prop-name { font-weight: 500; font-size: 0.9rem; color: #1e293b; }
.prop-key { font-size: 0.75rem; color: #6b7280; font-family: ui-monospace, monospace; }
.remove-prop {
  flex-shrink: 0; width: 1.5rem; height: 1.5rem; padding: 0;
  border-radius: 50%; border: 1px solid #fecaca; background: #fff; color: #dc2626;
  cursor: pointer; font-size: 1rem; line-height: 1;
}
.remove-prop:hover { background: #fef2f2; }

</style>
