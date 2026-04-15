<template>
  <div class="media-view">
    <div class="media-header">
      <div>
        <h1>Media Library</h1>
        <p class="subtitle">Upload and manage files</p>
      </div>
      <button class="upload-btn" @click="triggerFileInput" :disabled="uploading">
        <span v-if="uploading">Uploading...</span>
        <span v-else>Upload File</span>
      </button>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*,video/*,application/pdf"
        style="display: none"
        @change="handleFileChange"
      />
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <div v-if="files.length === 0 && !loading" class="empty-state">
      <p>No media files uploaded yet.</p>
      <p class="empty-hint">Click "Upload File" to get started.</p>
    </div>

    <div v-else class="media-grid">
      <div v-for="file in files" :key="file.filename" class="media-card">
        <img
          v-if="isImage(file.mimeType)"
          :src="file.url"
          :alt="file.originalName"
          class="media-thumb"
        />
        <div v-else class="media-icon">📄</div>
        <div class="media-info">
          <p class="media-name" :title="file.originalName">{{ file.originalName }}</p>
          <p class="media-meta">{{ formatSize(file.size) }}</p>
        </div>
        <button class="copy-btn" @click="copyUrl(file.url)" title="Copy URL">🔗</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface MediaFile {
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
  siteId: string
}

const fileInputRef = ref<HTMLInputElement | null>(null)
const files = ref<MediaFile[]>([])
const uploading = ref(false)
const loading = ref(false)
const error = ref('')

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
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  error.value = ''

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
    files.value.unshift(data.file)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Upload failed'
  } finally {
    uploading.value = false
    // Reset input so same file can be re-uploaded
    if (fileInputRef.value) fileInputRef.value.value = ''
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
  try {
    await navigator.clipboard.writeText(window.location.origin + url)
  } catch {
    // fallback
    prompt('Copy URL:', window.location.origin + url)
  }
}
</script>

<style scoped>
.media-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

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

.copy-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.media-card:hover .copy-btn {
  opacity: 1;
}
</style>
