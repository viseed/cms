<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useFloatingPosition } from '../composables/useFloatingPosition'
import { type SchemaPropertyInfo, useSchemaOrg } from '../composables/useSchemaOrg'

const props = defineProps<{
  /** IRI of the parent class whose properties we list */
  classIri: string
  /** IRIs of properties already used (to be hidden / dimmed) */
  usedProperties?: string[]
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: [property: SchemaPropertyInfo]
}>()

const { getPropertiesForClass, isLoading, loadError } = useSchemaOrg()

const properties = ref<SchemaPropertyInfo[]>([])
const search = ref('')
const isOpen = ref(false)
const wrapperRef = ref<HTMLDivElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const dropdownRef = ref<HTMLDivElement | null>(null)
const isLoadingProps = ref(false)
const { position: dropdownPos } = useFloatingPosition(triggerRef, isOpen)

const usedSet = computed(() => new Set(props.usedProperties ?? []))

const filteredProperties = computed(() => {
  const q = search.value.trim().toLowerCase()
  const pool = properties.value.filter((p) => !usedSet.value.has(p.iri))
  if (!q) return pool.slice(0, 100)
  return pool
    .filter((p) => p.label.toLowerCase().includes(q) || p.iri.toLowerCase().includes(q))
    .slice(0, 100)
})

async function loadProperties() {
  if (!props.classIri) {
    properties.value = []
    return
  }
  isLoadingProps.value = true
  try {
    properties.value = await getPropertiesForClass(props.classIri)
  } catch {
    properties.value = []
  } finally {
    isLoadingProps.value = false
  }
}

function selectProperty(prop: SchemaPropertyInfo) {
  emit('select', prop)
  isOpen.value = false
  search.value = ''
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node
  const inWrapper = wrapperRef.value?.contains(target) ?? false
  const inDropdown = dropdownRef.value?.contains(target) ?? false
  if (!inWrapper && !inDropdown) {
    isOpen.value = false
  }
}

watch(
  () => props.classIri,
  () => {
    properties.value = []
    if (isOpen.value) loadProperties()
  },
)

watch(isOpen, (open) => {
  if (open && properties.value.length === 0) loadProperties()
})

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="wrapperRef" class="schema-property-picker">
    <button
      ref="triggerRef"
      type="button"
      class="picker-trigger"
      :disabled="disabled || !classIri"
      @click="isOpen = !isOpen"
    >
      <span class="placeholder">{{ placeholder ?? '+ Add property' }}</span>
      <span class="chevron" :class="{ open: isOpen }">▾</span>
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
          placeholder="Search properties…"
          @click.stop
        />

        <div v-if="isLoading || isLoadingProps" class="picker-status">
          Loading properties…
        </div>
        <div v-else-if="loadError" class="picker-status error">
          {{ loadError }}
        </div>
        <div v-else-if="!classIri" class="picker-status">
          Select a class first.
        </div>
        <div v-else-if="filteredProperties.length === 0" class="picker-status">
          No properties available.
        </div>
        <ul v-else class="picker-list">
          <li
            v-for="prop in filteredProperties"
            :key="prop.iri"
            class="picker-item"
            @click="selectProperty(prop)"
          >
            <div class="item-row">
              <span class="term-name">{{ prop.label }}</span>
              <span class="term-iri">{{ prop.iri }}</span>
            </div>
            <p v-if="prop.description" class="item-desc">{{ prop.description }}</p>
            <div v-if="prop.ranges.length" class="ranges">
              <span v-for="range in prop.ranges" :key="range" class="range-tag">{{ range }}</span>
            </div>
          </li>
        </ul>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.schema-property-picker { position: relative; }

.picker-trigger {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.45rem 0.7rem; background: #f9fafb; border: 1px dashed #cbd5e0;
  border-radius: 8px; font-size: 0.85rem; cursor: pointer; color: #1a56db; text-align: left;
}
.picker-trigger:disabled { opacity: 0.5; cursor: not-allowed; color: #6b7280; }
.picker-trigger:hover:not(:disabled) { background: #eef4ff; border-color: #1a56db; }

.placeholder { font-weight: 500; }
.chevron { color: #6b7280; transition: transform 0.15s ease; }
.chevron.open { transform: rotate(180deg); }

.picker-dropdown {
  position: fixed;
  background: #fff; border: 1px solid #d1d5db; border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 1000;
  max-height: 360px; display: flex; flex-direction: column;
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
.item-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.term-name { font-weight: 500; }
.term-iri { font-size: 0.75rem; color: #6b7280; font-family: ui-monospace, monospace; }
.item-desc {
  margin: 0.15rem 0 0; font-size: 0.78rem; color: #6b7280;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ranges { margin-top: 0.25rem; display: flex; flex-wrap: wrap; gap: 0.25rem; }
.range-tag {
  font-size: 0.7rem; background: #f3f4f6; color: #374151;
  padding: 0.05rem 0.35rem; border-radius: 4px; font-family: ui-monospace, monospace;
}
</style>
