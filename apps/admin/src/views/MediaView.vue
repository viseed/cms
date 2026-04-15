<template>
  <div
    class="media-view"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Drop overlay -->
    <div v-if="dragging" class="drop-overlay">
      <div class="drop-overlay-inner">
        <span class="drop-icon">📥</span>
        <p>Drop files to upload</p>
      </div>
    </div>

    <div class="media-header">
      <div>
        <h1>Media Library</h1>
        <p class="subtitle">Upload and manage files — drag & drop anywhere to upload</p>
      </div>
      <div class="header-actions">
        <template v-if="selectedIds.length > 0">
          <button class="deselect-btn" @click="deselectAll">Deselect all</button>
          <button class="delete-selected-btn" @click="deleteSelected" :disabled="deletingCount > 0">
            <span v-if="deletingCount > 0">Deleting…</span>
            <span v-else>Delete ({{ selectedIds.length }})</span>
          </button>
        </template>
        <button class="upload-btn" @click="triggerFileInput" :disabled="uploadingCount > 0">
          <span v-if="uploadingCount > 0">Uploading {{ uploadingCount }}...</span>
          <span v-else>Upload Files</span>
        </button>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*,video/*,application/pdf"
        multiple
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="files.length === 0 && !loading" class="empty-state">
      <p>No media files uploaded yet.</p>
      <p class="empty-hint">Click "Upload Files" or drag & drop files here.</p>
    </div>

    <div v-else class="media-grid">
      <div
        v-for="file in files"
        :key="file.id"
        class="media-card"
        :class="{ 'is-selected': isSelected(file.id) }"
      >
        <label class="card-checkbox-wrap" @click.stop>
          <input
            type="checkbox"
            class="card-checkbox"
            :checked="isSelected(file.id)"
            @change="toggleSelect(file.id)"
          />
        </label>

        <img
          v-if="isImage(file.mimeType)"
          :src="file.url"
          :alt="file.alt ?? file.originalName"
          class="media-thumb"
        />
        <div v-else class="media-icon">📄</div>

        <div class="media-info">
          <p class="media-name" :title="file.originalName">{{ file.slug ?? file.originalName }}</p>
          <p class="media-meta">{{ formatSize(file.size) }}</p>
        </div>

        <div class="card-actions">
          <button class="action-btn edit-btn" @click="openEdit(file)" title="Edit">✏️</button>
          <button class="action-btn copy-btn" @click="copyUrl(file.url)" title="Copy URL">🔗</button>
          <button class="action-btn delete-btn" @click="deleteFile(file.id)" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="editTarget" class="modal-backdrop" @click.self="closeEdit">
      <div class="modal">
        <div class="modal-header">
          <h2>Edit Media</h2>
          <button class="modal-close" @click="closeEdit">✕</button>
        </div>

        <div class="modal-body">
          <!-- Preview -->
          <div class="edit-preview">
            <img
              v-if="isImage(editTarget.mimeType)"
              :src="editPreviewUrl ?? editTarget.url"
              :alt="editTarget.originalName"
              class="edit-thumb"
            />
            <div v-else class="edit-icon">📄</div>
            <p class="edit-original-name">{{ editTarget.originalName }}</p>
          </div>

          <!-- Slug -->
          <div class="form-group">
            <label class="form-label">URL Slug</label>
            <div class="slug-input-row">
              <span class="slug-prefix">/api/media/file/</span>
              <input
                v-model="editSlug"
                type="text"
                class="form-input slug-input"
                placeholder="e.g. hero-banner (leave blank for default URL)"
              />
            </div>
            <p class="form-hint">Leave blank to use the default upload URL.</p>
          </div>

          <!-- Alt text -->
          <div class="form-group">
            <label class="form-label">Alt Text</label>
            <input
              v-model="editAlt"
              type="text"
              class="form-input"
              placeholder="Descriptive text for accessibility"
            />
          </div>

          <!-- Replace file -->
          <div class="form-group">
            <label class="form-label">Replace File</label>
            <div class="replace-file-row">
              <button class="replace-btn" type="button" @click="triggerReplaceInput">
                Choose file…
              </button>
              <span class="replace-filename">{{ editFile ? editFile.name : 'No file chosen' }}</span>
            </div>
            <input
              ref="replaceInputRef"
              type="file"
              accept="image/*,video/*,application/pdf"
              style="display: none"
              @change="handleReplaceChange"
            />
          </div>

          <div v-if="editError" class="error-banner">{{ editError }}</div>
        </div>

        <div class="modal-footer">
          <button class="cancel-btn" @click="closeEdit" :disabled="editSaving">Cancel</button>
          <button class="save-btn" @click="saveEdit" :disabled="editSaving">
            <span v-if="editSaving">Saving…</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface MediaFile {
  id: string
  slug: string | null
  alt: string | null
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
  siteId: string
}

const fileInputRef = ref<HTMLInputElement | null>(null)
const replaceInputRef = ref<HTMLInputElement | null>(null)

const files = ref<MediaFile[]>([])
const loading = ref(false)
const error = ref('')

const dragging = ref(false)
const uploadingCount = ref(0)
const deletingCount = ref(0)

// Multi-select state
const selectedIds = ref<string[]>([])

// biome-ignore lint/correctness/noUnusedVariables: used in template
function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx === -1) selectedIds.value.push(id)
  else selectedIds.value.splice(idx, 1)
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function deselectAll() {
  selectedIds.value = []
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function deleteFile(id: string) {
  if (!confirm('Delete this file?')) return
  deletingCount.value += 1
  try {
    const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Delete failed')
    }
    files.value = files.value.filter((f) => f.id !== id)
    const idx = selectedIds.value.indexOf(id)
    if (idx !== -1) selectedIds.value.splice(idx, 1)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Delete failed'
  } finally {
    deletingCount.value -= 1
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (ids.length === 0) return
  if (!confirm(`Delete ${ids.length} file(s)? This cannot be undone.`)) return
  deletingCount.value += ids.length
  const failed: string[] = []
  for (const id of ids) {
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      files.value = files.value.filter((f) => f.id !== id)
    } catch {
      failed.push(id)
    } finally {
      deletingCount.value -= 1
    }
  }
  selectedIds.value = failed
  if (failed.length > 0) {
    error.value = `Failed to delete ${failed.length} file(s)`
  }
}

// Edit modal state
const editTarget = ref<MediaFile | null>(null)
const editSlug = ref('')
const editAlt = ref('')
const editFile = ref<File | null>(null)
const editPreviewUrl = ref<string | null>(null)
const editSaving = ref(false)
const editError = ref('')

onMounted(fetchFiles)

async function fetchFiles() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/media')
    if (!res.ok) throw new Error(`Failed to fetch media: ${res.statusText}`)
    const data = await res.json()
    files.value = data.files ?? []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load files'
  } finally {
    loading.value = false
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function triggerFileInput() {
  fileInputRef.value?.click()
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files
  if (!selected || selected.length === 0) return
  await uploadFiles(Array.from(selected))
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function onDragOver() {
  dragging.value = true
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function onDragLeave() {
  dragging.value = false
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function onDrop(event: DragEvent) {
  dragging.value = false
  const dropped = event.dataTransfer?.files
  if (!dropped || dropped.length === 0) return
  await uploadFiles(Array.from(dropped))
}

async function uploadFiles(fileList: File[]) {
  error.value = ''
  uploadingCount.value += fileList.length

  for (const file of fileList) {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Upload failed: ${res.statusText}`)
      }

      const data = await res.json()
      const uploaded: MediaFile = data.file ?? data.files?.[0]
      if (uploaded) files.value.unshift(uploaded)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Upload failed'
    } finally {
      uploadingCount.value -= 1
    }
  }
}

// Edit modal
// biome-ignore lint/correctness/noUnusedVariables: used in template
function openEdit(file: MediaFile) {
  editTarget.value = file
  editSlug.value = file.slug ?? ''
  editAlt.value = file.alt ?? ''
  editFile.value = null
  editPreviewUrl.value = null
  editError.value = ''
  editSaving.value = false
}

function closeEdit() {
  if (editSaving.value) return
  if (editPreviewUrl.value) URL.revokeObjectURL(editPreviewUrl.value)
  editTarget.value = null
  editFile.value = null
  editPreviewUrl.value = null
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function triggerReplaceInput() {
  replaceInputRef.value?.click()
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function handleReplaceChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  editFile.value = file
  if (editPreviewUrl.value) URL.revokeObjectURL(editPreviewUrl.value)
  editPreviewUrl.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
  if (replaceInputRef.value) replaceInputRef.value.value = ''
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function saveEdit() {
  if (!editTarget.value) return
  editSaving.value = true
  editError.value = ''

  try {
    const formData = new FormData()
    formData.append('slug', editSlug.value.trim())
    formData.append('alt', editAlt.value.trim())
    if (editFile.value) formData.append('file', editFile.value)

    const res = await fetch(`/api/media/${editTarget.value.id}`, {
      method: 'PATCH',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? `Save failed: ${res.statusText}`)
    }

    const data = await res.json()
    const updated: MediaFile = data.file

    const idx = files.value.findIndex((f) => f.id === updated.id)
    if (idx !== -1) files.value[idx] = updated

    closeEdit()
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Save failed'
  } finally {
    editSaving.value = false
  }
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function isImage(mimeType: string) {
  return mimeType.startsWith('image/')
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// biome-ignore lint/correctness/noUnusedVariables: used in template
async function copyUrl(url: string) {
  const full = url.startsWith('http') ? url : window.location.origin + url
  try {
    await navigator.clipboard.writeText(full)
  } catch {
    prompt('Copy URL:', full)
  }
}
</script>

<style scoped>
.media-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  min-height: 200px;
}

/* ---- Drop overlay ---- */
.drop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(108, 99, 255, 0.15);
  backdrop-filter: blur(2px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-overlay-inner {
  background: #fff;
  border: 2px dashed #6c63ff;
  border-radius: 16px;
  padding: 3rem 4rem;
  text-align: center;
  color: #6c63ff;
  font-size: 1.1rem;
  font-weight: 500;
  box-shadow: 0 8px 32px rgba(108, 99, 255, 0.2);
}

.drop-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.75rem;
}

/* ---- Header ---- */
.media-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.media-header h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.upload-btn {
  padding: 0.6rem 1.5rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}

.upload-btn:hover:not(:disabled) {
  background: #5a52d5;
}

.upload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.deselect-btn {
  padding: 0.6rem 1rem;
  background: #f0f0f0;
  color: #555;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: background 0.15s;
}

.deselect-btn:hover {
  background: #e0e0e0;
}

.delete-selected-btn {
  padding: 0.6rem 1.25rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: background 0.15s;
}

.delete-selected-btn:hover:not(:disabled) {
  background: #dc2626;
}

.delete-selected-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ---- Error ---- */
.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

/* ---- Empty ---- */
.empty-state {
  background: #fff;
  padding: 3rem;
  border-radius: 12px;
  text-align: center;
  color: #999;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.empty-hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

/* ---- Grid ---- */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.media-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s;
}

.media-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.media-card.is-selected {
  box-shadow: 0 0 0 2px #6c63ff, 0 4px 12px rgba(108, 99, 255, 0.15);
}

/* ---- Card checkbox ---- */
.card-checkbox-wrap {
  position: absolute;
  top: 0.4rem;
  left: 0.4rem;
  z-index: 2;
  display: flex;
  align-items: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.media-card:hover .card-checkbox-wrap,
.media-card.is-selected .card-checkbox-wrap {
  opacity: 1;
}

.card-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #6c63ff;
}


.media-thumb {
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.media-icon {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  background: #f8f8f8;
}

.uploading-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.3rem 0.7rem;
  border-radius: 20px;
  white-space: nowrap;
}

.media-info {
  padding: 0.6rem 0.75rem;
  flex: 1;
}

.media-name {
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0 0 0.2rem;
}

.media-meta {
  font-size: 0.75rem;
  color: #999;
  margin: 0;
}

/* ---- Card actions ---- */
.card-actions {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  display: flex;
  gap: 0.3rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.media-card:hover .card-actions {
  opacity: 1;
}

.action-btn {
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  cursor: pointer;
  line-height: 1.4;
  transition: background 0.1s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.75);
}

.action-btn.delete-btn:hover {
  background: rgba(220, 38, 38, 0.85);
}

/* ---- Modal ---- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h2 {
  font-size: 1.1rem;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #888;
  padding: 0.25rem;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.1s;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* ---- Edit preview ---- */
.edit-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.edit-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eee;
  flex-shrink: 0;
}

.edit-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: #f8f8f8;
  border-radius: 8px;
  flex-shrink: 0;
}

.edit-original-name {
  font-size: 0.85rem;
  color: #555;
  margin: 0;
  word-break: break-all;
}

/* ---- Form ---- */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #333;
}

.form-input {
  padding: 0.55rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #6c63ff;
  box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.12);
}

.slug-input-row {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.slug-input-row:focus-within {
  border-color: #6c63ff;
  box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.12);
}

.slug-prefix {
  padding: 0.55rem 0.6rem 0.55rem 0.75rem;
  background: #f5f5f5;
  color: #888;
  font-size: 0.78rem;
  white-space: nowrap;
  border-right: 1px solid #ddd;
  flex-shrink: 0;
}

.slug-input {
  border: none;
  border-radius: 0;
  box-shadow: none;
  flex: 1;
  min-width: 0;
}

.slug-input:focus {
  border: none;
  box-shadow: none;
}

.form-hint {
  font-size: 0.76rem;
  color: #999;
  margin: 0;
}

/* ---- Replace file ---- */
.replace-file-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.replace-btn {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
  flex-shrink: 0;
}

.replace-btn:hover {
  background: #e5e5e5;
}

.replace-filename {
  font-size: 0.82rem;
  color: #555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---- Modal buttons ---- */
.cancel-btn {
  padding: 0.55rem 1.25rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.1s;
}

.cancel-btn:hover:not(:disabled) {
  background: #e5e5e5;
}

.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn {
  padding: 0.55rem 1.5rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: #5a52d5;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
