<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminFetch } from '../../lib/admin-api'

interface WidgetItem {
  id: string
  name: string
  type: string
  typeLabel: string
  typeAvailable: boolean
  updatedAt: string
}

const emit = defineEmits<{
  select: [widgetId: string, widgetType: string]
  close: []
}>()

const widgets = ref<WidgetItem[]>([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const typeFilter = ref('')

const uniqueTypes = ref<Array<{ id: string; label: string }>>([])

onMounted(async () => {
  try {
    const res = await adminFetch('/api/admin/widgets')
    if (!res.ok) throw new Error(await res.text())
    const data: WidgetItem[] = await res.json()
    widgets.value = data
    const seen = new Set<string>()
    for (const w of data) {
      if (!seen.has(w.type)) {
        seen.add(w.type)
        uniqueTypes.value.push({ id: w.type, label: w.typeLabel })
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load widgets'
  } finally {
    loading.value = false
  }
})

function filteredWidgets() {
  const q = search.value.toLowerCase()
  return widgets.value.filter((w) => {
    if (typeFilter.value && w.type !== typeFilter.value) return false
    if (q && !w.name.toLowerCase().includes(q) && !w.typeLabel.toLowerCase().includes(q))
      return false
    return true
  })
}

function selectWidget(widget: WidgetItem) {
  emit('select', widget.id, widget.type)
}

function openWidgetsManager() {
  window.open('/admin/widgets', '_blank')
}
</script>

<template>
  <div class="widget-insert-modal-overlay" @click.self="emit('close')">
    <div class="widget-insert-modal">
      <div class="modal-header">
        <h3>Insert Widget</h3>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="error" class="error-banner">{{ error }}</div>

        <div class="filters">
          <input
            v-model="search"
            type="text"
            placeholder="Search widgets…"
            class="search-input"
            autofocus
          />
          <select v-if="uniqueTypes.length > 1" v-model="typeFilter" class="type-select">
            <option value="">All types</option>
            <option v-for="t in uniqueTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
          </select>
        </div>

        <div v-if="loading" class="loading">Loading…</div>

        <div v-else-if="filteredWidgets().length === 0" class="empty">
          <p>No widgets found.</p>
          <p class="empty-hint">
            <button class="btn-link" @click="openWidgetsManager">Open Widgets manager</button>
            to create one first.
          </p>
        </div>

        <div v-else class="widget-list">
          <button
            v-for="widget in filteredWidgets()"
            :key="widget.id"
            class="widget-row"
            @click="selectWidget(widget)"
          >
            <span class="widget-row-icon">❖</span>
            <span class="widget-row-name">{{ widget.name }}</span>
            <span class="widget-row-type">{{ widget.typeLabel }}</span>
            <span v-if="!widget.typeAvailable" class="badge-unavailable">unavailable</span>
          </button>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-link" @click="openWidgetsManager">
          Open Widgets manager ↗
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget-insert-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.widget-insert-modal {
  background: white;
  border-radius: 10px;
  width: 480px;
  max-width: 95vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 1rem;
  padding: 0.25rem;
  line-height: 1;
}
.modal-close:hover { color: #374151; }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}
.search-input:focus { outline: none; border-color: #2563eb; }

.type-select {
  padding: 0.4rem 0.6rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.loading {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 1rem 0;
}

.empty {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1.5rem 0;
}

.empty-hint {
  margin-top: 0.5rem;
  color: #9ca3af;
}

.widget-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.widget-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.1s;
  text-align: left;
  width: 100%;
}
.widget-row:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.widget-row-icon {
  color: #6366f1;
  font-size: 0.875rem;
}

.widget-row-name {
  font-weight: 500;
  font-size: 0.875rem;
  flex: 1;
  color: #111827;
}

.widget-row-type {
  font-size: 0.75rem;
  color: #9ca3af;
}

.badge-unavailable {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  background: #fef3c7;
  color: #b45309;
  border-radius: 9999px;
}

.modal-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-start;
}

.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  text-decoration: underline;
}
.btn-link:hover { color: #1d4ed8; }
</style>
