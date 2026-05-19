<script setup lang="ts">
import type { Component } from 'vue'
import { defineAsyncComponent, onMounted, ref, shallowRef } from 'vue'
import { usePluginComponent } from '../composables/usePluginComponent'
import { adminFetch } from '../lib/admin-api'

interface WidgetType {
  id: string
  label: string
  icon?: string
  description?: string
  pluginName: string
  configComponent: string
  publicComponent: string
  pluginEnabled: boolean
  hasPublicBundle: boolean
  defaultConfig?: Record<string, unknown>
}

interface WidgetItem {
  id: string
  siteId: string
  name: string
  type: string
  config: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
  typeLabel: string
  typeAvailable: boolean
}

type ModalStep = 'pick-type' | 'configure'

const widgets = ref<WidgetItem[]>([])
const widgetTypes = ref<WidgetType[]>([])
const loading = ref(true)
const error = ref('')

const showModal = ref(false)
const modalStep = ref<ModalStep>('pick-type')
const editingWidget = ref<WidgetItem | null>(null)
const saving = ref(false)
const deleting = ref<string | null>(null)

const form = ref({
  name: '',
  type: '',
  config: {} as Record<string, unknown>,
})

const typeSearch = ref('')
const configComponent = shallowRef<Component | null>(null)

const { resolveComponent } = usePluginComponent()

async function loadWidgets() {
  try {
    const res = await adminFetch('/api/admin/widgets')
    if (!res.ok) throw new Error(await res.text())
    widgets.value = await res.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load widgets'
  }
}

async function loadWidgetTypes() {
  try {
    const res = await adminFetch('/api/admin/widget-types')
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    widgetTypes.value = data.types ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load widget types'
  }
}

onMounted(async () => {
  await Promise.all([loadWidgets(), loadWidgetTypes()])
  loading.value = false
})

function openCreate() {
  editingWidget.value = null
  form.value = { name: '', type: '', config: {} }
  typeSearch.value = ''
  configComponent.value = null
  modalStep.value = 'pick-type'
  showModal.value = true
}

function openEdit(widget: WidgetItem) {
  editingWidget.value = widget
  form.value = { name: widget.name, type: widget.type, config: { ...(widget.config as Record<string, unknown>) } }
  typeSearch.value = ''
  const wType = widgetTypes.value.find((t) => t.id === widget.type)
  if (wType) {
    configComponent.value = resolveComponent(wType.pluginName, wType.configComponent)
  } else {
    configComponent.value = null
  }
  modalStep.value = 'configure'
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  configComponent.value = null
}

function filteredTypes() {
  const q = typeSearch.value.toLowerCase()
  return widgetTypes.value.filter(
    (t) =>
      t.pluginEnabled &&
      (!q || t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)),
  )
}

function selectType(type: WidgetType) {
  form.value.type = type.id
  form.value.config = { ...(type.defaultConfig ?? {}) }
  configComponent.value = resolveComponent(type.pluginName, type.configComponent)
  modalStep.value = 'configure'
}

async function saveWidget() {
  const name = form.value.name.trim()
  if (!name) {
    error.value = 'Widget name is required.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const isEdit = editingWidget.value !== null
    const url = isEdit ? `/api/admin/widgets/${editingWidget.value!.id}` : '/api/admin/widgets'
    const method = isEdit ? 'PUT' : 'POST'
    const body: Record<string, unknown> = { name, config: form.value.config }
    if (!isEdit) body.type = form.value.type

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
    await loadWidgets()
    closeModal()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save widget'
  } finally {
    saving.value = false
  }
}

async function deleteWidget(widget: WidgetItem) {
  if (!confirm(`Delete widget "${widget.name}"?`)) return
  deleting.value = widget.id
  error.value = ''
  try {
    const res = await adminFetch(`/api/admin/widgets/${widget.id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    await loadWidgets()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to delete widget'
  } finally {
    deleting.value = null
  }
}

function openWidgetsManagerTab() {
  window.open('/admin/widgets', '_blank')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div class="widgets-view">
    <div class="view-header">
      <div>
        <h1>Widgets</h1>
        <p class="subtitle">Create reusable widgets to embed in your content</p>
      </div>
      <button class="btn-primary" @click="openCreate" :disabled="widgetTypes.filter(t => t.pluginEnabled).length === 0">
        New Widget
      </button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="loading" class="loading-state">Loading widgets…</div>

    <div v-else-if="widgetTypes.filter(t => t.pluginEnabled).length === 0 && !loading" class="empty-state">
      <p>No widget types available.</p>
      <p class="empty-hint">Install and enable a plugin that provides widget types.</p>
    </div>

    <div v-else-if="widgets.length === 0" class="empty-state">
      <p>No widgets created yet.</p>
      <p class="empty-hint">Click "New Widget" to create your first reusable widget.</p>
    </div>

    <table v-else class="widgets-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Updated</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="widget in widgets" :key="widget.id">
          <td class="widget-name">{{ widget.name }}</td>
          <td>
            <span v-if="!widget.typeAvailable" class="badge badge-warning">{{ widget.type }} (unavailable)</span>
            <span v-else class="badge">{{ widget.typeLabel }}</span>
          </td>
          <td class="widget-date">{{ formatDate(widget.updatedAt) }}</td>
          <td class="widget-actions">
            <button class="btn-icon" @click="openEdit(widget)" title="Edit">✎</button>
            <button
              class="btn-icon btn-danger"
              @click="deleteWidget(widget)"
              :disabled="deleting === widget.id"
              title="Delete"
            >✕</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Create / Edit modal -->
    <div v-if="showModal" class="modal-overlay" @mousedown.self="closeModal">
      <div class="modal">
        <!-- Step 1: pick type (create only) -->
        <template v-if="modalStep === 'pick-type'">
          <div class="modal-header">
            <h2>Choose Widget Type</h2>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <input
              v-model="typeSearch"
              class="search-input"
              type="text"
              placeholder="Search widget types…"
              autofocus
            />
            <div v-if="filteredTypes().length === 0" class="empty-state">
              <p>No widget types match your search.</p>
            </div>
            <div class="type-grid">
              <button
                v-for="wt in filteredTypes()"
                :key="wt.id"
                class="type-card"
                @click="selectType(wt)"
              >
                <span class="type-icon">{{ wt.icon ?? '❖' }}</span>
                <span class="type-label">{{ wt.label }}</span>
                <span v-if="wt.description" class="type-desc">{{ wt.description }}</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Step 2: configure -->
        <template v-else>
          <div class="modal-header">
            <h2>{{ editingWidget ? 'Edit Widget' : 'New Widget' }}</h2>
            <button class="modal-close" @click="closeModal">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="error" class="error-banner">{{ error }}</div>

            <div class="field">
              <label>Name <span class="required">*</span></label>
              <input v-model="form.name" type="text" placeholder="e.g. Homepage Newsletter" class="input" />
            </div>

            <!-- Plugin-supplied config form -->
            <div v-if="configComponent" class="plugin-config-form">
              <component :is="configComponent" v-model="form.config" />
            </div>
            <div v-else class="config-notice">
              <p>
                Config form not available.
                <button class="btn-link" @click="openWidgetsManagerTab">Open Widgets manager</button>
                to manage this widget's configuration.
              </p>
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="!editingWidget" class="btn-secondary" @click="modalStep = 'pick-type'">
              ← Back
            </button>
            <button class="btn-primary" @click="saveWidget" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save Widget' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widgets-view {
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

.widgets-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.widgets-table th {
  text-align: left;
  padding: 0.5rem 1rem;
  border-bottom: 2px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
}

.widgets-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

.widget-name {
  font-weight: 500;
}

.widget-date {
  color: #9ca3af;
  font-size: 0.8rem;
}

.widget-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-warning {
  background: #fef3c7;
  color: #b45309;
}

/* Buttons */
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
.btn-secondary:hover { background: #e5e7eb; }

.btn-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #374151;
  transition: all 0.15s;
}
.btn-icon:hover { background: #f3f4f6; }
.btn-icon.btn-danger:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; }
.btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
  font-size: inherit;
  padding: 0;
}

/* Modal */
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

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Type grid */
.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
}
.search-input:focus { outline: none; border-color: #2563eb; }

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
.type-card:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

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

/* Configure step */
.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.required {
  color: #dc2626;
}

.input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
}
.input:focus { outline: none; border-color: #2563eb; }

.plugin-config-form {
  border-top: 1px solid #e5e7eb;
  padding-top: 1.25rem;
}

.config-notice {
  color: #6b7280;
  font-size: 0.875rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
</style>
