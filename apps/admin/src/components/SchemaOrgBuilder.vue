<script setup lang="ts">
import type { SchemaOrgItem } from '@hana/validator'
import { computed } from 'vue'
import SchemaItemEditor from './SchemaItemEditor.vue'

const props = defineProps<{
  modelValue: SchemaOrgItem[] | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SchemaOrgItem[]]
}>()

const items = computed<SchemaOrgItem[]>(() => props.modelValue ?? [])

function addItem() {
  const next = [...items.value, { '@type': 'Thing' } as SchemaOrgItem]
  emit('update:modelValue', next)
}

function updateItem(index: number, value: SchemaOrgItem) {
  const next = [...items.value]
  next[index] = value
  emit('update:modelValue', next)
}

function removeItem(index: number) {
  const next = [...items.value]
  next.splice(index, 1)
  emit('update:modelValue', next)
}

function moveItem(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= items.value.length) return
  const next = [...items.value]
  const [removed] = next.splice(index, 1)
  next.splice(target, 0, removed!)
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="schema-org-builder">
    <div class="builder-header">
      <div class="builder-title">
        <h4>Schema.org</h4>
        <p>Structured data emitted as JSON-LD on the public page.</p>
      </div>
      <button type="button" class="add-btn" @click="addItem">+ Add schema</button>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      No schema yet. Click <strong>Add schema</strong> to start.
    </div>

    <div v-else class="items-list">
      <div v-for="(item, index) in items" :key="index" class="schema-card">
        <div class="card-header">
          <div class="card-title">
            <span class="index">#{{ index + 1 }}</span>
            <span class="type-name">{{ item['@type'] || 'Thing' }}</span>
          </div>
          <div class="card-actions">
            <button
              type="button"
              class="icon-btn"
              title="Move up"
              :disabled="index === 0"
              @click="moveItem(index, -1)"
            >↑</button>
            <button
              type="button"
              class="icon-btn"
              title="Move down"
              :disabled="index === items.length - 1"
              @click="moveItem(index, 1)"
            >↓</button>
            <button
              type="button"
              class="icon-btn danger"
              title="Remove"
              @click="removeItem(index)"
            >×</button>
          </div>
        </div>
        <SchemaItemEditor
          :model-value="item"
          @update:model-value="updateItem(index, $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-org-builder { display: flex; flex-direction: column; gap: 0.75rem; }

.builder-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
}
.builder-title h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
.builder-title p { margin: 0.15rem 0 0; font-size: 0.78rem; color: #6b7280; }

.add-btn {
  flex-shrink: 0; padding: 0.4rem 0.75rem; font-size: 0.85rem;
  background: #1a56db; color: #fff; border: none; border-radius: 6px;
  cursor: pointer; font-weight: 500;
}
.add-btn:hover { background: #1e429f; }

.empty-state {
  padding: 1rem; text-align: center; color: #6b7280;
  background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 8px;
  font-size: 0.85rem;
}

.items-list { display: flex; flex-direction: column; gap: 0.75rem; }

.schema-card {
  display: flex; flex-direction: column; gap: 0.5rem;
  padding: 0.75rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
}

.card-header {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
}
.card-title { display: flex; align-items: baseline; gap: 0.5rem; }
.index { font-size: 0.75rem; color: #6b7280; font-family: ui-monospace, monospace; }
.type-name { font-weight: 600; color: #1e293b; }

.card-actions { display: flex; gap: 0.25rem; }
.icon-btn {
  width: 1.75rem; height: 1.75rem; padding: 0; border-radius: 4px;
  background: #fff; border: 1px solid #e5e7eb; color: #6b7280;
  cursor: pointer; font-size: 0.85rem; line-height: 1;
}
.icon-btn:hover:not(:disabled) { background: #f3f4f6; color: #1e293b; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.icon-btn.danger { color: #dc2626; border-color: #fecaca; }
.icon-btn.danger:hover { background: #fef2f2; }
</style>
