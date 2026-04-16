<script setup lang="ts">
import type {
  ThemeSettingsField,
  ThemeSettingsItemField,
  ThemeSettingsItemListField,
  ThemeSettingsLinkItem,
  ThemeSettingsSelectField,
} from '@hana/types'
import { computed, ref } from 'vue'
import { useMediaPicker } from '../../composables/useMediaPicker'

const props = defineProps<{
  field: ThemeSettingsField
  modelValue: unknown
}>()

const emit = defineEmits<(e: 'update:modelValue', value: unknown) => void>()

const fieldId = computed(() => `field-${props.field.key}`)

function update(value: unknown) {
  emit('update:modelValue', value)
}

const { openMediaPicker } = useMediaPicker()

async function browseMedia(onSelect: (url: string) => void) {
  const url = await openMediaPicker()
  if (url) onSelect(url)
}

const selectField = computed(() =>
  props.field.type === 'select' ? (props.field as ThemeSettingsSelectField) : null,
)

// ---------------------------------------------------------------------------
// Link list helpers
// ---------------------------------------------------------------------------
const linkItems = computed(() => (props.modelValue as ThemeSettingsLinkItem[]) ?? [])

function addLink() {
  update([...linkItems.value, { label: '', url: '', target: '_self' }])
}

function updateLink(index: number, patch: Partial<ThemeSettingsLinkItem>) {
  const links = linkItems.value.map((item, i) => (i === index ? { ...item, ...patch } : item))
  update(links)
}

function removeLink(index: number) {
  update(linkItems.value.filter((_, i) => i !== index))
}

// ---------------------------------------------------------------------------
// Item list helpers (grid thumbnail + drag-drop + modal)
// ---------------------------------------------------------------------------
type ItemRecord = Record<string, unknown>

const ilField = computed(() =>
  props.field.type === 'item_list' ? (props.field as ThemeSettingsItemListField) : null,
)

const ilItems = computed(() => (props.modelValue as ItemRecord[]) ?? [])

function ilBuildEmpty(): ItemRecord {
  const item: ItemRecord = {}
  for (const f of ilField.value?.itemSchema ?? []) {
    item[f.key] = f.type === 'boolean' ? false : ''
  }
  return item
}

function ilUpdate(items: ItemRecord[]) {
  update([...items])
}

function ilAddItem() {
  ilUpdate([...ilItems.value, ilBuildEmpty()])
}

function ilRemoveItem(index: number) {
  ilUpdate(ilItems.value.filter((_, i) => i !== index))
}

function ilToggleActive(index: number) {
  const updated = ilItems.value.map((item, i) => {
    if (i !== index) return item
    return { ...item, active: !item.active }
  })
  ilUpdate(updated)
}

// Drag-and-drop
const ilDragIndex = ref<number | null>(null)
const ilDragOverIndex = ref<number | null>(null)

function ilOnDragStart(index: number, e: Event) {
  ilDragIndex.value = index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dt = (e as any).dataTransfer as { effectAllowed: string; setData(f: string, v: string): void } | null
  if (dt) {
    dt.effectAllowed = 'move'
    dt.setData('text/plain', String(index))
  }
}

function ilOnDragOver(index: number, e: Event) {
  e.preventDefault()
  ilDragOverIndex.value = index
}

function ilOnDragLeave() {
  ilDragOverIndex.value = null
}

function ilOnDrop(targetIndex: number, e: Event) {
  e.preventDefault()
  if (ilDragIndex.value === null || ilDragIndex.value === targetIndex) {
    ilDragIndex.value = null
    ilDragOverIndex.value = null
    return
  }
  const arr = [...ilItems.value]
  const moved = arr.splice(ilDragIndex.value, 1)[0]
  if (moved !== undefined) arr.splice(targetIndex, 0, moved)
  ilDragIndex.value = null
  ilDragOverIndex.value = null
  ilUpdate(arr)
}

function ilOnDragEnd() {
  ilDragIndex.value = null
  ilDragOverIndex.value = null
}

// Edit modal
const ilEditingIndex = ref(-1)
const ilEditDraft = ref<ItemRecord | null>(null)

function ilOpenEdit(index: number) {
  ilEditingIndex.value = index
  ilEditDraft.value = { ...ilItems.value[index] }
}

function ilOpenAdd() {
  ilEditingIndex.value = ilItems.value.length
  ilEditDraft.value = ilBuildEmpty()
}

function ilCloseEdit() {
  ilEditingIndex.value = -1
  ilEditDraft.value = null
}

function ilSaveEdit() {
  if (!ilEditDraft.value) return
  const arr = [...ilItems.value]
  if (ilEditingIndex.value >= arr.length) {
    arr.push({ ...ilEditDraft.value })
  } else {
    arr[ilEditingIndex.value] = { ...ilEditDraft.value }
  }
  ilUpdate(arr)
  ilCloseEdit()
}

function ilSubFieldUpdate(subField: ThemeSettingsItemField, value: unknown) {
  if (!ilEditDraft.value) return
  ilEditDraft.value = { ...ilEditDraft.value, [subField.key]: value }
}

function ilThumbnailUrl(item: ItemRecord): string {
  const key = ilField.value?.imageKey
  if (!key) return ''
  return (item[key] as string) ?? ''
}

const ilModalTitle = computed(() => {
  if (ilEditingIndex.value < ilItems.value.length) return 'Edit Item'
  return 'Add Item'
})
</script>

<template>
  <div class="settings-field">
    <label :for="fieldId" class="field-label">
      {{ field.label }}
      <span v-if="field.required" class="required-mark" aria-label="required">*</span>
    </label>

    <p v-if="field.description" class="field-description">{{ field.description }}</p>

    <!-- text -->
    <input
      v-if="field.type === 'text'"
      :id="fieldId"
      type="text"
      class="field-input"
      :value="(modelValue as string) ?? ''"
      :placeholder="field.placeholder"
      :maxlength="field.maxLength"
      @input="update(($event.target as HTMLInputElement).value)"
    />

    <!-- textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :id="fieldId"
      class="field-input field-textarea"
      :value="(modelValue as string) ?? ''"
      :placeholder="field.placeholder"
      :rows="field.rows ?? 4"
      @input="update(($event.target as HTMLTextAreaElement).value)"
    />

    <!-- boolean -->
    <label v-else-if="field.type === 'boolean'" :for="fieldId" class="field-toggle">
      <input
        :id="fieldId"
        type="checkbox"
        :checked="(modelValue as boolean) ?? false"
        @change="update(($event.target as HTMLInputElement).checked)"
      />
      <span class="toggle-track" />
    </label>

    <!-- select -->
    <select
      v-else-if="field.type === 'select'"
      :id="fieldId"
      class="field-input"
      :value="(modelValue as string) ?? ''"
      @change="update(($event.target as HTMLSelectElement).value)"
    >
      <option v-for="opt in selectField?.options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- color -->
    <div v-else-if="field.type === 'color'" class="field-color-row">
      <input
        :id="fieldId"
        type="color"
        class="field-color-swatch"
        :value="(modelValue as string) ?? '#000000'"
        @input="update(($event.target as HTMLInputElement).value)"
      />
      <input
        type="text"
        class="field-input field-color-text"
        :value="(modelValue as string) ?? ''"
        placeholder="#000000"
        @input="update(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- image (URL input) -->
    <div v-else-if="field.type === 'image'" class="field-image-row">
      <input
        :id="fieldId"
        type="url"
        class="field-input"
        :value="(modelValue as string) ?? ''"
        placeholder="https://..."
        @input="update(($event.target as HTMLInputElement).value)"
      />
      <button type="button" class="browse-media-btn" title="Browse media library" @click="browseMedia(update)">
        Browse
      </button>
    </div>
    <div v-if="field.type === 'image' && modelValue" class="field-image-preview">
      <img :src="(modelValue as string)" alt="preview" />
    </div>

    <!-- link_list -->
    <div v-else-if="field.type === 'link_list'" class="field-linklist">
      <div
        v-for="(link, index) in linkItems"
        :key="index"
        class="link-item"
      >
        <input
          type="text"
          class="field-input link-label"
          :value="link.label"
          placeholder="Label"
          @input="updateLink(index, { label: ($event.target as HTMLInputElement).value })"
        />
        <input
          type="url"
          class="field-input link-url"
          :value="link.url"
          placeholder="https://..."
          @input="updateLink(index, { url: ($event.target as HTMLInputElement).value })"
        />
        <select
          class="field-input link-target"
          :value="link.target ?? '_self'"
          @change="updateLink(index, { target: ($event.target as HTMLSelectElement).value as '_self' | '_blank' })"
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
        <button type="button" class="link-remove" title="Remove link" @click="removeLink(index)">
          ✕
        </button>
      </div>
      <button type="button" class="link-add" @click="addLink">+ Add link</button>
    </div>

    <!-- item_list: thumbnail grid with drag-drop + edit modal -->
    <div v-else-if="field.type === 'item_list'" class="field-itemlist">
      <div class="il-grid">
        <div
          v-for="(item, index) in ilItems"
          :key="index"
          class="il-card"
          :class="{
            'il-card--drag-over': ilDragOverIndex === index,
            'il-card--dragging': ilDragIndex === index,
            'il-card--inactive': item.active === false,
          }"
          draggable="true"
          @dragstart="ilOnDragStart(index, $event)"
          @dragover="ilOnDragOver(index, $event)"
          @dragleave="ilOnDragLeave"
          @drop="ilOnDrop(index, $event)"
          @dragend="ilOnDragEnd"
        >
          <!-- Thumbnail -->
          <div class="il-thumb">
            <img
              v-if="ilThumbnailUrl(item)"
              :src="ilThumbnailUrl(item)"
              :alt="String(item.title ?? item.label ?? `Item ${index + 1}`)"
            />
            <div v-else class="il-thumb-placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <span class="il-order-badge">{{ index + 1 }}</span>
          </div>

          <!-- Hover overlay -->
          <div class="il-overlay">
            <!-- Edit -->
            <button
              type="button"
              class="il-action"
              title="Edit"
              @click.stop="ilOpenEdit(index)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <!-- Toggle active -->
            <button
              type="button"
              class="il-action"
              :title="item.active === false ? 'Enable' : 'Disable'"
              @click.stop="ilToggleActive(index)"
            >
              <svg v-if="item.active !== false" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
            <!-- Delete -->
            <button
              type="button"
              class="il-action il-action--danger"
              title="Delete"
              @click.stop="ilRemoveItem(index)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Add new item card -->
        <button
          v-if="!ilField?.maxItems || ilItems.length < ilField.maxItems"
          type="button"
          class="il-add-card"
          @click="ilOpenAdd"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Add item</span>
        </button>
      </div>

      <!-- Edit modal -->
      <div v-if="ilEditDraft" class="il-modal-backdrop" @click.self="ilCloseEdit">
        <div class="il-modal">
          <div class="il-modal-header">
            <h3>{{ ilModalTitle }}</h3>
            <button type="button" class="il-modal-close" @click="ilCloseEdit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="il-modal-body">
            <template v-for="subField in ilField?.itemSchema" :key="subField.key">
              <div class="il-form-group">
                <label class="il-form-label">
                  {{ subField.label }}
                  <span v-if="subField.required" class="required-mark">*</span>
                </label>

                <!-- boolean sub-field -->
                <label v-if="subField.type === 'boolean'" class="field-toggle">
                  <input
                    type="checkbox"
                    :checked="ilEditDraft[subField.key] !== false && ilEditDraft[subField.key] !== undefined ? !!ilEditDraft[subField.key] : false"
                    @change="ilSubFieldUpdate(subField, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="toggle-track" />
                </label>

                <!-- image sub-field -->
                <template v-else-if="subField.type === 'image'">
                  <div class="field-image-row">
                    <input
                      type="text"
                      class="field-input"
                      :value="String(ilEditDraft[subField.key] ?? '')"
                      :placeholder="subField.placeholder ?? 'https://... or /uploads/...'"
                      @input="ilSubFieldUpdate(subField, ($event.target as HTMLInputElement).value)"
                    />
                    <button
                      type="button"
                      class="browse-media-btn"
                      title="Browse media library"
                      @click="browseMedia((url) => ilSubFieldUpdate(subField, url))"
                    >
                      Browse
                    </button>
                  </div>
                  <div v-if="ilEditDraft[subField.key]" class="il-img-preview">
                    <img :src="String(ilEditDraft[subField.key])" alt="preview" />
                  </div>
                </template>

                <!-- text sub-field -->
                <input
                  v-else
                  type="text"
                  class="field-input"
                  :value="String(ilEditDraft[subField.key] ?? '')"
                  :placeholder="subField.placeholder ?? ''"
                  @input="ilSubFieldUpdate(subField, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </template>
          </div>

          <div class="il-modal-footer">
            <button type="button" class="il-btn-secondary" @click="ilCloseEdit">Cancel</button>
            <button type="button" class="il-btn-primary" @click="ilSaveEdit">Save</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #222;
}

.required-mark {
  color: #e53935;
  margin-left: 2px;
}

.field-description {
  font-size: 0.8rem;
  color: #777;
  margin: 0;
}

.field-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #222;
  background: #fff;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #6c63ff;
}

.field-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Toggle */
.field-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.field-toggle input[type='checkbox'] {
  display: none;
}

.toggle-track {
  display: inline-block;
  width: 36px;
  height: 20px;
  background: #ddd;
  border-radius: 999px;
  position: relative;
  transition: background 0.2s;
}

.toggle-track::after {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.field-toggle input:checked + .toggle-track {
  background: #6c63ff;
}

.field-toggle input:checked + .toggle-track::after {
  transform: translateX(16px);
}

/* Color */
.field-color-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-image-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.field-image-row .field-input {
  flex: 1;
}
.browse-media-btn {
  flex-shrink: 0;
  padding: 0.45rem 0.85rem;
  background: var(--color-bg-secondary, #1a1c26);
  border: 1px solid var(--color-border, #2e3144);
  border-radius: 6px;
  color: var(--color-text, #e2e8f0);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}
.browse-media-btn:hover {
  background: var(--color-border, #2e3144);
  border-color: var(--color-primary, #6366f1);
}
.field-image-preview {
  margin-top: 0.5rem;
}
.field-image-preview img {
  max-width: 100%;
  max-height: 120px;
  border-radius: 6px;
  border: 1px solid var(--color-border, #2e3144);
  object-fit: cover;
}

.field-color-swatch {
  width: 40px;
  height: 38px;
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.field-color-text {
  flex: 1;
}

/* Link list */
.field-linklist {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-item {
  display: grid;
  grid-template-columns: 1fr 2fr 120px auto;
  gap: 0.5rem;
  align-items: center;
}

.link-remove {
  background: none;
  border: 1px solid #e53935;
  color: #e53935;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
  flex-shrink: 0;
}

.link-remove:hover {
  background: #ffebee;
}

.link-add {
  align-self: flex-start;
  background: none;
  border: 1px dashed #6c63ff;
  color: #6c63ff;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.15s;
}

.link-add:hover {
  background: #f3f1ff;
}

/* -------------------------------------------------------------------------
   Item list — grid + drag-drop + modal
   ------------------------------------------------------------------------- */

.field-itemlist {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.il-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

/* Individual item card */
.il-card {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: grab;
  transition: border-color 0.15s, opacity 0.15s, transform 0.15s;
  background: #f5f5f5;
}

.il-card:active {
  cursor: grabbing;
}

.il-card--drag-over {
  border-color: #6c63ff;
  transform: scale(1.03);
}

.il-card--dragging {
  opacity: 0.4;
}

.il-card--inactive {
  opacity: 0.5;
}

/* Thumbnail area — square */
.il-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #e8e8e8;
}

.il-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.il-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
}

.il-order-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 4px;
  padding: 1px 5px;
  line-height: 1.4;
  pointer-events: none;
}

/* Hover overlay */
.il-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  opacity: 0;
  transition: opacity 0.18s;
  pointer-events: none;
}

.il-card:hover .il-overlay {
  opacity: 1;
  pointer-events: auto;
}

.il-action {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s;
}

.il-action:hover {
  background: #fff;
}

.il-action--danger:hover {
  background: #ffebee;
  color: #e53935;
}

/* Add item card */
.il-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  aspect-ratio: 1 / 1;
  border: 2px dashed #c8c8c8;
  border-radius: 8px;
  background: none;
  color: #aaa;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  padding: 0;
}

.il-add-card:hover {
  border-color: #6c63ff;
  color: #6c63ff;
}

/* Modal */
.il-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.il-modal {
  background: #fff;
  border-radius: 12px;
  width: 480px;
  max-width: calc(100vw - 2rem);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.il-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #eee;
}

.il-modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #222;
}

.il-modal-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.il-modal-close:hover {
  color: #222;
}

.il-modal-body {
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.il-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.il-form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
}

.il-img-preview {
  margin-top: 0.5rem;
  border-radius: 6px;
  overflow: hidden;
  height: 120px;
  background: #f0f0f0;
}

.il-img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.il-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #eee;
}

.il-btn-secondary {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: #fff;
  color: #444;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.il-btn-secondary:hover {
  background: #f5f5f5;
}

.il-btn-primary {
  padding: 0.5rem 1rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.il-btn-primary:hover {
  background: #574fd6;
}
</style>
