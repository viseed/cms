<script setup lang="ts">
import type { Component } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { usePluginComponent } from '../composables/usePluginComponent'
import { adminFetch } from '../lib/admin-api'

interface DashboardWidgetType {
  id: string
  label: string
  icon?: string
  description?: string
  pluginName: string
  component: string
  supportedSizes: string[]
  defaultSize: string
  pluginEnabled: boolean
}

interface DashboardWidgetItem {
  id: string
  siteId: string
  type: string
  size: string
  position: number
  label: string
  icon: string | null
  pluginName: string | null
  component: string | null
  supportedSizes: string[]
  available: boolean
}

const GRID_COLUMNS = 4

const items = ref<DashboardWidgetItem[]>([])
const types = ref<DashboardWidgetType[]>([])
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const busy = ref(false)
const showPicker = ref(false)

const { resolveComponent } = usePluginComponent()

const availableTypes = computed(() => types.value.filter((t) => t.pluginEnabled))

function parseSize(size: string): { cols: number; rows: number } {
  const [cols, rows] = size.split('x').map((n) => Number.parseInt(n, 10))
  return {
    cols: Math.min(Math.max(cols || 1, 1), GRID_COLUMNS),
    rows: Math.max(rows || 1, 1),
  }
}

function widgetStyle(item: DashboardWidgetItem) {
  const { cols, rows } = parseSize(item.size)
  return { gridColumn: `span ${cols}`, gridRow: `span ${rows}` }
}

function widgetComponent(item: DashboardWidgetItem): Component | null {
  if (!item.available || !item.pluginName || !item.component) return null
  return resolveComponent(item.pluginName, item.component)
}

function widgetTitle(item: DashboardWidgetItem): string {
  return item.icon ? `${item.icon} ${item.label}` : item.label
}

async function loadTypes() {
  const res = await adminFetch('/api/admin/dashboard-widget-types')
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  types.value = data.types ?? []
}

async function loadItems() {
  const res = await adminFetch('/api/admin/dashboard-widgets')
  if (!res.ok) throw new Error(await res.text())
  items.value = await res.json()
}

async function reload() {
  loading.value = true
  error.value = ''
  try {
    await Promise.all([loadTypes(), loadItems()])
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(reload)

async function addWidget(type: DashboardWidgetType) {
  busy.value = true
  error.value = ''
  try {
    const res = await adminFetch('/api/admin/dashboard-widgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type.id, size: type.defaultSize }),
    })
    if (!res.ok) throw new Error(await res.text())
    showPicker.value = false
    await loadItems()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to add widget'
  } finally {
    busy.value = false
  }
}

function onSizeChange(item: DashboardWidgetItem, event: Event) {
  const size = (event.target as HTMLSelectElement).value
  void changeSize(item, size)
}

async function changeSize(item: DashboardWidgetItem, size: string) {
  if (size === item.size) return
  busy.value = true
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/dashboard-widgets/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size }),
    })
    if (!res.ok) throw new Error(await res.text())
    item.size = size
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to resize widget'
  } finally {
    busy.value = false
  }
}

async function removeWidget(item: DashboardWidgetItem) {
  busy.value = true
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/dashboard-widgets/${item.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    items.value = items.value.filter((w) => w.id !== item.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to remove widget'
  } finally {
    busy.value = false
  }
}

async function persistOrder() {
  busy.value = true
  error.value = ''
  try {
    const res = await adminFetch('/api/admin/dashboard-widgets/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.value.map((w) => w.id) }),
    })
    if (!res.ok) throw new Error(await res.text())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save order'
    await loadItems()
  } finally {
    busy.value = false
  }
}

async function move(item: DashboardWidgetItem, direction: -1 | 1) {
  const index = items.value.findIndex((w) => w.id === item.id)
  const target = index + direction
  if (target < 0 || target >= items.value.length) return
  const next = [...items.value]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  items.value = next
  await persistOrder()
}
</script>

<template>
  <div class="dashboard">
    <div class="view-header">
      <div>
        <h1>Dashboard</h1>
      </div>
      <div class="header-actions">
        <button
          v-if="editing"
          class="btn-secondary"
          :disabled="availableTypes.length === 0 || busy"
          @click="showPicker = true"
        >
          Add Widget
        </button>
        <button class="btn-primary" @click="editing = !editing">
          {{ editing ? 'Done' : 'Edit Layout' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading dashboard…</div>

    <div v-else-if="items.length === 0" class="empty-state">
      <p>Your dashboard is empty.</p>
      <p class="empty-hint">
        Click "Edit Layout" then "Add Widget" to place dashboard widgets provided by plugins.
      </p>
    </div>

    <div v-else class="widget-grid" :class="{ editing }">
      <div
        v-for="item in items"
        :key="item.id"
        class="widget-cell"
        :style="widgetStyle(item)"
      >
        <div v-if="editing" class="widget-toolbar">
          <span class="widget-title">{{ widgetTitle(item) }}</span>
          <div class="toolbar-controls">
            <button class="btn-icon" title="Move up" @click="move(item, -1)">↑</button>
            <button class="btn-icon" title="Move down" @click="move(item, 1)">↓</button>
            <select
              class="size-select"
              :value="item.size"
              :disabled="item.supportedSizes.length === 0"
              @change="onSizeChange(item, $event)"
            >
              <option v-for="s in item.supportedSizes" :key="s" :value="s">{{ s }}</option>
            </select>
            <button class="btn-icon btn-danger" title="Remove" @click="removeWidget(item)">✕</button>
          </div>
        </div>

        <div class="widget-body">
          <component :is="widgetComponent(item)" v-if="widgetComponent(item)" />
          <div v-else class="widget-unavailable">
            <p>{{ item.label }}</p>
            <p class="unavailable-hint">
              Widget unavailable — the plugin providing it is disabled or removed.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Widget type picker -->
    <div v-if="showPicker" class="modal-overlay" @mousedown.self="showPicker = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Add Dashboard Widget</h2>
          <button class="modal-close" @click="showPicker = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="availableTypes.length === 0" class="empty-state">
            <p>No dashboard widgets available.</p>
            <p class="empty-hint">Install and enable a plugin that provides dashboard widgets.</p>
          </div>
          <div v-else class="type-grid">
            <button
              v-for="t in availableTypes"
              :key="t.id"
              class="type-card"
              :disabled="busy"
              @click="addWidget(t)"
            >
              <span class="type-icon">{{ t.icon ?? '◫' }}</span>
              <span class="type-label">{{ t.label }}</span>
              <span v-if="t.description" class="type-desc">{{ t.description }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.view-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.loading-state {
  color: #666;
  padding: 2rem 0;
}

.empty-state {
  padding: 3rem 0;
  text-align: center;
  color: #666;
}

.empty-hint {
  font-size: 0.875rem;
  color: #999;
  margin-top: 0.5rem;
}

.widget-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 180px;
  gap: 1.25rem;
}

.widget-cell {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.widget-grid.editing .widget-cell {
  outline: 1px dashed #c7d2fe;
}

.widget-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.widget-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toolbar-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.widget-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.widget-unavailable {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
}

.unavailable-hint {
  font-size: 0.75rem;
  margin-top: 0.35rem;
}

.size-select {
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 0.15rem 0.25rem;
  background: white;
  cursor: pointer;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-secondary:hover:not(:disabled) { background: #e5e7eb; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-icon {
  width: 1.75rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  color: #374151;
  transition: all 0.15s;
}
.btn-icon:hover { background: #f3f4f6; }
.btn-icon.btn-danger:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: white;
  border-radius: 10px;
  width: 540px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #9ca3af;
  padding: 0.25rem;
  line-height: 1;
}
.modal-close:hover { color: #374151; }

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.type-card:hover:not(:disabled) {
  border-color: #2563eb;
  background: #eff6ff;
}
.type-card:disabled { opacity: 0.5; cursor: not-allowed; }

.type-icon {
  font-size: 1.5rem;
}

.type-label {
  font-weight: 500;
  font-size: 0.85rem;
  color: #111827;
}

.type-desc {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
