<script setup lang="ts">
import { ref } from 'vue'
import { RichTextEditor } from '@viseed/ui/vue'

interface QaItem {
  id: string
  question: string
  answer: string
}

interface QaConfig {
  items: QaItem[]
}

const props = defineProps<{ modelValue: QaConfig }>()
const emit = defineEmits<{ 'update:modelValue': [QaConfig] }>()

const expandedIndex = ref<number | null>(props.modelValue.items.length > 0 ? 0 : null)

function toggle(index: number) {
  expandedIndex.value = expandedIndex.value === index ? null : index
}

function update(patch: Partial<QaConfig>) {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function updateItem(index: number, patch: Partial<QaItem>) {
  const items = props.modelValue.items.map((it, i) =>
    i === index ? { ...it, ...patch } : it,
  )
  update({ items })
}

function addItem() {
  const id = `qa-${Date.now()}`
  const newItems = [...props.modelValue.items, { id, question: '', answer: '' }]
  update({ items: newItems })
  expandedIndex.value = newItems.length - 1
}

function removeItem(index: number) {
  const newItems = props.modelValue.items.filter((_, i) => i !== index)
  update({ items: newItems })
  if (expandedIndex.value === index) {
    expandedIndex.value = newItems.length > 0 ? Math.max(0, index - 1) : null
  } else if (expandedIndex.value !== null && expandedIndex.value > index) {
    expandedIndex.value -= 1
  }
}
</script>

<template>
  <div class="qa-config">
    <div class="qa-list">
      <div
        v-for="(item, index) in modelValue.items"
        :key="item.id"
        class="qa-item"
        :class="{ 'is-open': expandedIndex === index }"
      >
        <button
          type="button"
          class="qa-item-header"
          @click="toggle(index)"
        >
          <span class="qa-chevron">{{ expandedIndex === index ? '▾' : '▸' }}</span>
          <span class="qa-label">{{ item.question || `Question ${index + 1}` }}</span>
          <span
            v-if="modelValue.items.length > 1"
            class="btn-remove"
            role="button"
            title="Remove question"
            @click.stop="removeItem(index)"
          >✕</span>
        </button>

        <div v-if="expandedIndex === index" class="qa-item-body">
          <div class="field">
            <label>Question</label>
            <input
              type="text"
              class="input"
              :value="item.question"
              placeholder="e.g. What is the benefit?"
              @input="updateItem(index, { question: ($event.target as HTMLInputElement).value })"
            />
          </div>
          <div class="field">
            <label>Answer</label>
            <RichTextEditor
              :model-value="item.answer"
              placeholder="Enter answer…"
              @update:model-value="updateItem(index, { answer: $event })"
            />
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="btn-add" @click="addItem">+ Add question</button>
  </div>
</template>

<style scoped>
.qa-config {
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

.input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}
.input:focus { outline: none; border-color: #2563eb; }

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.qa-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.qa-item.is-open {
  border-color: #bfdbfe;
}

.qa-item-header {
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

.qa-item-header:hover {
  background: #f3f4f6;
}

.is-open .qa-item-header {
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 500;
}

.qa-chevron {
  font-size: 0.75rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.is-open .qa-chevron {
  color: #3b82f6;
}

.qa-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-item-body {
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
