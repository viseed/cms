<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useFloatingPosition } from '../composables/useFloatingPosition'
import { type SchemaClassInfo, useSchemaOrg } from '../composables/useSchemaOrg'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  /** Only enumeration classes (used by SchemaPropertyInput when range is enum) */
  enumerationOnly?: boolean
  /** Optional list of allowed class IRIs (when null, allow all) */
  allowedIris?: string[] | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { getAllClasses, isLoading, loadError } = useSchemaOrg()

const allClasses = ref<SchemaClassInfo[]>([])
const search = ref('')
const isOpen = ref(false)
const wrapperRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)
const { position: dropdownPos } = useFloatingPosition(triggerRef, isOpen)

const selectedClass = computed(
  () => allClasses.value.find((c) => c.iri === props.modelValue) ?? null,
)

const filteredClasses = computed(() => {
  let pool = allClasses.value
  if (props.enumerationOnly) pool = pool.filter((c) => c.isEnumeration)
  if (props.allowedIris && props.allowedIris.length > 0) {
    const set = new Set(props.allowedIris)
    pool = pool.filter((c) => set.has(c.iri))
  }
  const q = search.value.trim().toLowerCase()
  if (!q) return pool.slice(0, 100)
  return pool
    .filter((c) => c.label.toLowerCase().includes(q) || c.iri.toLowerCase().includes(q))
    .slice(0, 100)
})

async function ensureLoaded() {
  if (allClasses.value.length === 0) {
    try {
      allClasses.value = await getAllClasses()
    } catch {
      // handled by loadError
    }
  }
}

function selectClass(cls: SchemaClassInfo) {
  emit('update:modelValue', cls.iri)
  isOpen.value = false
  search.value = ''
}

function clearSelection() {
  emit('update:modelValue', '')
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node
  const inWrapper = wrapperRef.value?.contains(target) ?? false
  const inDropdown = dropdownRef.value?.contains(target) ?? false
  if (!inWrapper && !inDropdown) isOpen.value = false
}

watch(isOpen, (open) => {
  if (open) ensureLoaded()
})

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div ref="wrapperRef" class="schema-class-picker">
    <button
      ref="triggerRef"
      type="button"
      class="picker-trigger"
      :disabled="disabled"
      @click="isOpen = !isOpen"
    >
      <span v-if="selectedClass" class="selected-label">
        <span class="term-name">{{ selectedClass.label }}</span>
        <span class="term-iri">{{ selectedClass.iri }}</span>
      </span>
      <span v-else class="placeholder">{{ placeholder ?? 'Select a class…' }}</span>
      <span class="chevron" :class="{ open: isOpen }">▾</span>
    </button>

    <button
      v-if="selectedClass && !disabled"
      type="button"
      class="clear-btn"
      title="Clear"
      @click.stop="clearSelection"
    >
      ×
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="picker-dropdown"
        :style="{
          top: `${dropdownPos.top}px`,
          left: `${dropdownPos.left}px`,
          width: `${dropdownPos.width}px`,
        }"
      >
        <input
          v-model="search"
          type="text"
          class="picker-search"
          placeholder="Search classes…"
          @click.stop
        />

        <div v-if="isLoading && allClasses.length === 0" class="picker-status">
          Loading schema vocabulary…
        </div>
        <div v-else-if="loadError" class="picker-status error">
          {{ loadError }}
        </div>
        <div v-else-if="filteredClasses.length === 0" class="picker-status">
          No classes match.
        </div>
        <ul v-else class="picker-list">
          <li
            v-for="cls in filteredClasses"
            :key="cls.iri"
            class="picker-item"
            :class="{ selected: cls.iri === modelValue }"
            @click="selectClass(cls)"
          >
            <div class="item-row">
              <span class="term-name">{{ cls.label }}</span>
              <span v-if="cls.isEnumeration" class="enum-tag">enum</span>
              <span class="term-iri">{{ cls.iri }}</span>
            </div>
            <p v-if="cls.description" class="item-desc">{{ cls.description }}</p>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.schema-class-picker {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
}

.picker-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  color: #1e293b;
}
.picker-trigger:disabled { opacity: 0.6; cursor: not-allowed; }
.picker-trigger:hover:not(:disabled) { border-color: #1a56db; }

.placeholder { color: #9ca3af; }
.selected-label { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.term-name { font-weight: 500; }
.term-iri { font-size: 0.75rem; color: #6b7280; font-family: ui-monospace, monospace; }

.chevron { color: #6b7280; transition: transform 0.15s ease; }
.chevron.open { transform: rotate(180deg); }

.clear-btn {
  width: 2rem; padding: 0; border-radius: 8px; border: 1px solid #d1d5db;
  background: #fff; color: #6b7280; cursor: pointer; font-size: 1.1rem; line-height: 1;
}
.clear-btn:hover { background: #fef2f2; color: #dc2626; }

.picker-dropdown {
  position: fixed;
  background: #fff; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 1000; max-height: 360px; display: flex; flex-direction: column;
}

.picker-search {
  padding: 0.5rem 0.75rem; border: none; border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem; outline: none; border-radius: 8px 8px 0 0;
}

.picker-status { padding: 0.75rem 1rem; color: #6b7280; font-size: 0.85rem; }
.picker-status.error { color: #c53030; }

.picker-list { list-style: none; margin: 0; padding: 0.25rem 0; overflow-y: auto; }
.picker-item {
  padding: 0.5rem 0.75rem; cursor: pointer; border-radius: 4px; margin: 0 0.25rem;
}
.picker-item:hover { background: #f3f4f6; }
.picker-item.selected { background: #eef4ff; }
.item-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.item-desc {
  margin: 0.15rem 0 0; font-size: 0.78rem; color: #6b7280;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.enum-tag {
  font-size: 0.65rem; background: #fef3c7; color: #92400e;
  padding: 0.05rem 0.35rem; border-radius: 4px; text-transform: uppercase;
}
</style>
