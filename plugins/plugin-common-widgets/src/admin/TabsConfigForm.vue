<script setup lang="ts">
import { RichTextEditor } from '@viseed/ui/vue'
import { computed, ref } from 'vue'

interface Tab {
  id: string
  title: string
  content: string
}

interface TabsConfig {
  orientation?: 'vertical' | 'horizontal'
  tabs?: Tab[]
}

const props = defineProps<{ modelValue: TabsConfig }>()

interface NormalizedTabsConfig {
  orientation: 'vertical' | 'horizontal'
  tabs: Tab[]
}

const emit = defineEmits<{ 'update:modelValue': [NormalizedTabsConfig] }>()

const normalized = computed<NormalizedTabsConfig>(() => ({
  orientation: props.modelValue.orientation ?? 'horizontal',
  tabs: Array.isArray(props.modelValue.tabs) ? props.modelValue.tabs : [],
}))

const expandedIndex = ref<number | null>(normalized.value.tabs.length > 0 ? 0 : null)

function toggle(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function update(patch: Partial<NormalizedTabsConfig>) {
  emit('update:modelValue', { ...normalized.value, ...patch })
}

function updateTab(index: number, patch: Partial<Tab>) {
  const tabs = normalized.value.tabs.map((t, i) => (i === index ? { ...t, ...patch } : t))
  update({ tabs })
}

function addTab() {
  const id = `tab-${Date.now()}`
  const newTabs = [...normalized.value.tabs, { id, title: '', content: '' }]
  update({ tabs: newTabs })
  expandedIndex.value = newTabs.length - 1
}

function removeTab(index: number) {
  const newTabs = normalized.value.tabs.filter((_, i) => i !== index)
  update({ tabs: newTabs })
  if (expandedIndex.value === index) {
    expandedIndex.value = newTabs.length > 0 ? Math.max(0, index - 1) : null
  } else if (expandedIndex.value !== null && expandedIndex.value > index) {
    expandedIndex.value -= 1
  }
}
</script>

<template>
  <div class="tabs-config">
    <div class="field">
      <label>Layout</label>
      <div class="orientation-group">
        <label class="radio-label">
          <input
            type="radio"
            name="orientation"
            value="horizontal"
            :checked="normalized.orientation === 'horizontal'"
            @change="update({ orientation: 'horizontal' })"
          />
          Horizontal
        </label>
        <label class="radio-label">
          <input
            type="radio"
            name="orientation"
            value="vertical"
            :checked="normalized.orientation === 'vertical'"
            @change="update({ orientation: 'vertical' })"
          />
          Vertical
        </label>
      </div>
    </div>

    <div class="tabs-list">
      <div
        v-for="(tab, index) in normalized.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ 'is-open': expandedIndex === index }"
      >
        <button
          type="button"
          class="tab-item-header"
          @click="toggle(index)"
        >
          <span class="tab-chevron">{{ expandedIndex === index ? '▾' : '▸' }}</span>
          <span class="tab-label">{{ tab.title || `Tab ${index + 1}` }}</span>
          <span
            v-if="normalized.tabs.length > 1"
            class="btn-remove"
            role="button"
            title="Remove tab"
            @click.stop="removeTab(index)"
          >✕</span>
        </button>

        <div v-if="expandedIndex === index" class="tab-item-body">
          <div class="field">
            <label>Tab title</label>
            <input
              type="text"
              class="input"
              :value="tab.title"
              placeholder="e.g. Overview"
              @input="updateTab(index, { title: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="field">
            <label>Tab content</label>
            <RichTextEditor
              :model-value="tab.content"
              placeholder="Enter tab content…"
              @update:model-value="updateTab(index, { content: $event })"
            />
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="btn-add" @click="addTab">+ Add tab</button>
  </div>
</template>

<style scoped>
.tabs-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #374151;
}

.orientation-group {
  display: flex;
  gap: 1.25rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}
.input:focus { outline: none; border-color: #2563eb; }

.tabs-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.tab-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.tab-item.is-open {
  border-color: #bfdbfe;
}

.tab-item-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.875rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  color: #374151;
}

.tab-item-header:hover {
  background: #f3f4f6;
}

.is-open .tab-item-header {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 500;
}

.tab-chevron {
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.is-open .tab-chevron {
  color: #3b82f6;
}

.tab-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-item-body {
  padding: 0.875rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-remove {
  flex-shrink: 0;
  cursor: pointer;
  color: #9ca3af;
  font-size: 0.75rem;
  padding: 2px 5px;
  border-radius: 4px;
  line-height: 1;
}
.btn-remove:hover { background: #fee2e2; color: #dc2626; }

.btn-add {
  align-self: flex-start;
  padding: 0.4rem 0.875rem;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  background: transparent;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}
.btn-add:hover { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
</style>
