<template>
  <Teleport to="body">
    <div v-if="isOpen" class="media-picker-backdrop" @mousedown.self="cancelPicker">
      <div class="media-picker-modal" role="dialog" aria-modal="true" aria-label="Media Picker">
        <div class="mp-header">
          <h2 class="mp-title">Choose Media</h2>
          <button class="mp-close-btn" aria-label="Close" @click="cancelPicker">✕</button>
        </div>

        <div class="mp-toolbar">
          <div class="mp-search-wrap">
            <input
              v-model="searchQuery"
              type="search"
              class="mp-search"
              placeholder="Search files…"
              @input="onSearchInput"
            />
          </div>
          <select v-model="mimeFilter" class="mp-mime-filter" @change="resetAndFetch">
            <option value="">All types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
            <option value="application/pdf">PDFs</option>
          </select>
        </div>

        <div class="mp-body">
          <div v-if="loading" class="mp-loading">Loading…</div>
          <div v-else-if="error" class="mp-error">{{ error }}</div>
          <div v-else-if="files.length === 0" class="mp-empty">
            <span>No media files found.</span>
          </div>
          <div v-else class="mp-grid">
            <button
              v-for="file in files"
              :key="file.id"
              class="mp-card"
              :class="{ 'is-selected': selected?.id === file.id }"
              :title="file.originalName"
              @click="selectFile(file)"
              @dblclick="confirmSelected"
            >
              <img
                v-if="isImage(file.mimeType)"
                :src="file.url"
                :alt="file.alt ?? file.originalName"
                class="mp-thumb"
                loading="lazy"
              />
              <div v-else class="mp-icon">📄</div>
              <div class="mp-card-name">{{ file.slug ?? file.originalName }}</div>
            </button>
          </div>
        </div>

        <div v-if="totalPages > 1" class="mp-pagination">
          <button :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
        </div>

        <div class="mp-footer">
          <div class="mp-selected-info">
            <template v-if="selected">
              <img
                v-if="isImage(selected.mimeType)"
                :src="selected.url"
                class="mp-preview-thumb"
                :alt="selected.originalName"
              />
              <span class="mp-selected-name">{{ selected.slug ?? selected.originalName }}</span>
            </template>
            <span v-else class="mp-no-selection">No file selected</span>
          </div>
          <div class="mp-footer-actions">
            <button class="mp-cancel-btn" @click="cancelPicker">Cancel</button>
            <button class="mp-confirm-btn" :disabled="!selected" @click="confirmSelected">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { adminFetch } from '../lib/admin-api'
import { useMediaPicker } from '../composables/useMediaPicker'

interface MediaFile {
  id: string
  siteId: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  slug: string | null
  alt: string | null
  url: string
}

const LIMIT = 24

const { isOpen, confirmSelection, cancelPicker } = useMediaPicker()

const files = ref<MediaFile[]>([])
const selected = ref<MediaFile | null>(null)
const loading = ref(false)
const error = ref('')
const page = ref(1)
const totalPages = ref(1)
const searchQuery = ref('')
const mimeFilter = ref('')

let searchDebounce: ReturnType<typeof setTimeout> | null = null

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

async function fetchFiles() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: String(LIMIT),
    })
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim())
    if (mimeFilter.value) params.set('mimeType', mimeFilter.value)

    const res = await adminFetch(`/api/media?${params.toString()}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    files.value = data.files ?? []
    totalPages.value = data.pages ?? 1
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load media'
  } finally {
    loading.value = false
  }
}

function resetAndFetch() {
  page.value = 1
  selected.value = null
  fetchFiles()
}

function onSearchInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(resetAndFetch, 300)
}

function changePage(newPage: number) {
  page.value = newPage
  fetchFiles()
}

function selectFile(file: MediaFile) {
  selected.value = file
}

function confirmSelected() {
  if (!selected.value) return
  confirmSelection(selected.value.url)
  selected.value = null
}

// Reset state when modal opens
watch(isOpen, (open) => {
  if (open) {
    page.value = 1
    searchQuery.value = ''
    mimeFilter.value = ''
    selected.value = null
    fetchFiles()
  }
})
</script>

<style scoped>
.media-picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  padding: 1rem;
}

.media-picker-modal {
  background: var(--color-surface, #1e2028);
  border: 1px solid var(--color-border, #2e3144);
  border-radius: 12px;
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}

/* Header */
.mp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #2e3144);
  flex-shrink: 0;
}
.mp-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.mp-close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted, #9ca3af);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  line-height: 1;
  transition: background 0.15s;
}
.mp-close-btn:hover {
  background: var(--color-border, #2e3144);
}

/* Toolbar */
.mp-toolbar {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #2e3144);
  flex-shrink: 0;
}
.mp-search-wrap {
  flex: 1;
}
.mp-search,
.mp-mime-filter {
  width: 100%;
  padding: 0.45rem 0.75rem;
  background: var(--color-bg, #13141b);
  border: 1px solid var(--color-border, #2e3144);
  border-radius: 6px;
  color: var(--color-text, #e2e8f0);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}
.mp-search:focus,
.mp-mime-filter:focus {
  border-color: var(--color-primary, #6366f1);
}
.mp-mime-filter {
  width: auto;
  min-width: 130px;
}

/* Body */
.mp-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  min-height: 200px;
}
.mp-loading,
.mp-error,
.mp-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: var(--color-text-muted, #9ca3af);
  font-size: 0.875rem;
}
.mp-error {
  color: var(--color-danger, #ef4444);
}

/* Grid */
.mp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.75rem;
}
.mp-card {
  background: var(--color-bg, #13141b);
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  text-align: left;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.mp-card:hover {
  border-color: var(--color-border-hover, #3e4466);
}
.mp-card.is-selected {
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
}
.mp-thumb {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  display: block;
}
.mp-icon {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  background: var(--color-bg-secondary, #1a1c26);
}
.mp-card-name {
  padding: 0.35rem 0.5rem;
  font-size: 0.7rem;
  color: var(--color-text-muted, #9ca3af);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Pagination */
.mp-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.5rem 1.25rem;
  border-top: 1px solid var(--color-border, #2e3144);
  font-size: 0.85rem;
  flex-shrink: 0;
}
.mp-pagination button {
  background: var(--color-bg, #13141b);
  border: 1px solid var(--color-border, #2e3144);
  color: var(--color-text, #e2e8f0);
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  transition: background 0.15s;
}
.mp-pagination button:hover:not(:disabled) {
  background: var(--color-border, #2e3144);
}
.mp-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Footer */
.mp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--color-border, #2e3144);
  flex-shrink: 0;
}
.mp-selected-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  overflow: hidden;
  flex: 1;
}
.mp-preview-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}
.mp-selected-name {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-no-selection {
  font-size: 0.85rem;
  color: var(--color-text-muted, #9ca3af);
}
.mp-footer-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.mp-cancel-btn,
.mp-confirm-btn {
  padding: 0.5rem 1.1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, opacity 0.15s;
}
.mp-cancel-btn {
  background: var(--color-bg, #13141b);
  border-color: var(--color-border, #2e3144);
  color: var(--color-text, #e2e8f0);
}
.mp-cancel-btn:hover {
  background: var(--color-border, #2e3144);
}
.mp-confirm-btn {
  background: var(--color-primary, #6366f1);
  color: #fff;
}
.mp-confirm-btn:hover:not(:disabled) {
  background: var(--color-primary-hover, #4f46e5);
}
.mp-confirm-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
