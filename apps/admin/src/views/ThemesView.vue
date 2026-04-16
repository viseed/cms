<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useThemePreview } from '../composables/useThemePreview'
import { adminFetch } from '../lib/admin-api'

const router = useRouter()
const {
  status: previewStatus,
  loading: previewLoading,
  refresh: refreshPreview,
} = useThemePreview()

interface ThemeItem {
  name: string
  version: string
  description: string
  installed: boolean
  active: boolean
  missingRequiredLayouts: string[]
}

const themes = ref<ThemeItem[]>([])
const loading = ref(true)
const actionLoading = ref<string | null>(null)
const notification = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const previewPathInput = ref('')
const previewNameInput = ref('')
const previewSubdirInput = ref('preview')

const previewHomeUrl = computed(() => {
  const t = previewStatus.value?.token
  if (!t) return ''
  if (typeof window === 'undefined') return ''
  const u = new URL(window.location.origin)
  u.pathname = '/'
  u.searchParams.set('hana_preview', t)
  return u.toString()
})

async function loadThemes() {
  try {
    const res = await adminFetch('/api/admin/themes')
    if (res.ok) {
      themes.value = await res.json()
    }
  } catch {
    themes.value = [
      {
        name: 'default-theme',
        version: '0.1.0',
        description: 'default-theme theme',
        installed: true,
        active: true,
        missingRequiredLayouts: [],
      },
    ]
  } finally {
    loading.value = false
  }
  await refreshPreview()
}

onMounted(loadThemes)

function showNotification(type: 'success' | 'error', text: string) {
  notification.value = { type, text }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

async function startPathPreview() {
  const path = previewPathInput.value.trim()
  if (!path) {
    showNotification('error', 'Enter a preview path (e.g. themes/my-theme/preview).')
    return
  }
  actionLoading.value = '__preview__'
  try {
    const res = await adminFetch('/api/admin/themes/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      showNotification('success', body.message ?? 'Preview enabled.')
      await refreshPreview()
    } else {
      showNotification('error', body.error ?? 'Failed to enable preview.')
    }
  } finally {
    actionLoading.value = null
  }
}

async function startNamedPreview() {
  const name = previewNameInput.value.trim()
  const subdir = previewSubdirInput.value.trim() || 'preview'
  if (!name) {
    showNotification('error', 'Enter a theme folder name.')
    return
  }
  actionLoading.value = '__preview__'
  try {
    const res = await adminFetch('/api/admin/themes/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subdir }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      showNotification('success', body.message ?? 'Preview enabled.')
      await refreshPreview()
    } else {
      showNotification('error', body.error ?? 'Failed to enable preview.')
    }
  } finally {
    actionLoading.value = null
  }
}

async function clearPreview() {
  actionLoading.value = '__preview_clear__'
  try {
    const res = await adminFetch('/api/admin/themes/preview', {
      method: 'DELETE',
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok) {
      showNotification('success', body.message ?? 'Preview cleared.')
      await refreshPreview()
    } else {
      showNotification('error', body.error ?? 'Failed to clear preview.')
    }
  } finally {
    actionLoading.value = null
  }
}

async function installTheme(theme: ThemeItem) {
  actionLoading.value = theme.name
  try {
    const res = await adminFetch(`/api/admin/themes/${theme.name}/install`, {
      method: 'POST',
    })
    if (res.ok) {
      theme.installed = true
    } else {
      const body = await res.json().catch(() => ({}))
      showNotification('error', body.error ?? `Failed to install theme "${theme.name}".`)
    }
  } finally {
    actionLoading.value = null
  }
}

async function uninstallTheme(theme: ThemeItem) {
  actionLoading.value = theme.name
  try {
    const res = await adminFetch(`/api/admin/themes/${theme.name}/uninstall`, {
      method: 'POST',
    })
    if (res.ok) {
      theme.installed = false
    } else {
      const body = await res.json().catch(() => ({}))
      showNotification('error', body.error ?? `Failed to uninstall theme "${theme.name}".`)
    }
  } finally {
    actionLoading.value = null
  }
}

async function previewTheme(theme: ThemeItem) {
  actionLoading.value = `preview_${theme.name}`
  try {
    const res = await adminFetch('/api/admin/themes/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeName: theme.name, skipCookie: true }),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.previewQueryExample) {
      window.open(body.previewQueryExample, '_blank', 'noopener,noreferrer')
    } else {
      showNotification('error', body.error ?? 'Failed to get preview URL.')
    }
  } finally {
    actionLoading.value = null
  }
}

async function activateTheme(theme: ThemeItem) {
  actionLoading.value = theme.name
  try {
    const res = await adminFetch(`/api/admin/themes/${theme.name}/activate`, {
      method: 'POST',
    })
    const body = await res.json().catch(() => ({}))

    if (res.ok) {
      showNotification(
        'success',
        body.message ?? `Theme "${theme.name}" activated. Restart required.`,
      )
      // Mark theme as pending-active in the UI so the user knows their choice was recorded
      themes.value.forEach((t) => {
        t.active = t.name === theme.name
      })
    } else {
      showNotification('error', body.error ?? `Failed to activate theme "${theme.name}".`)
    }
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <div class="themes-view">
    <h1>Theme Catalog</h1>
    <p class="subtitle">Installed themes and their status</p>

    <div
      v-if="notification"
      class="notification"
      :class="notification.type"
    >
      {{ notification.text }}
    </div>

    <section class="preview-panel" aria-label="Theme path preview">
      <h2>Path preview</h2>
      <p class="preview-hint">
        Preview templates and static files from a folder under
        <code>themes/</code> without changing the active theme. Only requests that include the
        preview token (cookie set here, or <code>?hana_preview=</code>) use the preview path.
      </p>

      <div
        v-if="previewStatus?.active"
        class="preview-banner"
        role="status"
      >
        <span class="preview-badge">Previewing</span>
        <span class="preview-path">{{ previewStatus.previewThemePath }}</span>
        <button
          type="button"
          class="theme-action uninstall"
          :disabled="actionLoading === '__preview_clear__'"
          @click="clearPreview"
        >
          {{ actionLoading === '__preview_clear__' ? '…' : 'Clear preview' }}
        </button>
        <a
          v-if="previewHomeUrl"
          class="preview-open-link"
          :href="previewHomeUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open site with token
        </a>
      </div>

      <div v-else-if="previewLoading" class="preview-loading">Loading preview status…</div>

      <div class="preview-forms">
        <div class="preview-form-block">
          <label for="preview-path">Full path (from project root)</label>
          <div class="preview-inline">
            <input
              id="preview-path"
              v-model="previewPathInput"
              type="text"
              class="preview-input"
              placeholder="themes/my-theme/preview"
              autocomplete="off"
            >
            <button
              type="button"
              class="theme-action install"
              :disabled="actionLoading === '__preview__'"
              @click="startPathPreview"
            >
              {{ actionLoading === '__preview__' ? '…' : 'Apply' }}
            </button>
          </div>
        </div>
        <div class="preview-form-block">
          <label>Or build from theme name + subfolder</label>
          <div class="preview-inline preview-inline-triple">
            <input
              v-model="previewNameInput"
              type="text"
              class="preview-input"
              placeholder="theme folder name"
              aria-label="Theme folder name"
              autocomplete="off"
            >
            <input
              v-model="previewSubdirInput"
              type="text"
              class="preview-input preview-input-narrow"
              placeholder="subdir"
              aria-label="Subfolder under theme"
              autocomplete="off"
            >
            <button
              type="button"
              class="theme-action install"
              :disabled="actionLoading === '__preview__'"
              @click="startNamedPreview"
            >
              {{ actionLoading === '__preview__' ? '…' : 'Apply' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="loading">Loading themes...</div>

    <div v-else-if="themes.length === 0" class="empty">
      No themes installed.
    </div>

    <div v-else class="themes-grid">
      <div v-for="theme in themes" :key="theme.name" class="theme-card">
        <div class="theme-header">
          <span class="theme-name">{{ theme.name }}</span>
          <span class="theme-badge" :class="{ active: theme.active }">
            {{ theme.active ? 'Active' : 'Inactive' }}
          </span>
        </div>
        <p class="theme-desc">{{ theme.description }}</p>

        <div v-if="theme.missingRequiredLayouts.length" class="theme-warning">
          Missing layouts: {{ theme.missingRequiredLayouts.join(', ') }}
        </div>

        <div class="theme-footer">
          <span class="theme-version">v{{ theme.version }}</span>
          <div class="theme-actions">
            <button
              class="theme-action preview"
              :disabled="actionLoading === `preview_${theme.name}`"
              title="Open theme preview in new tab"
              @click="previewTheme(theme)"
            >
              {{ actionLoading === `preview_${theme.name}` ? '…' : 'Preview' }}
            </button>
            <button
              v-if="theme.active"
              class="theme-action settings"
              title="Configure theme settings"
              @click="router.push(`/themes/${theme.name}/settings`)"
            >
              Settings
            </button>
            <button
              v-if="theme.installed && !theme.active"
              class="theme-action activate"
              :disabled="actionLoading === theme.name"
              title="Set as active theme (requires restart)"
              @click="activateTheme(theme)"
            >
              {{ actionLoading === theme.name ? '...' : 'Activate' }}
            </button>
            <button
              v-if="theme.installed"
              class="theme-action uninstall"
              :disabled="theme.active || actionLoading === theme.name"
              :title="theme.active ? 'Cannot uninstall the active theme' : 'Uninstall theme'"
              @click="uninstallTheme(theme)"
            >
              Uninstall
            </button>
            <button
              v-else
              class="theme-action install"
              :disabled="actionLoading === theme.name"
              @click="installTheme(theme)"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.themes-view h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.loading,
.empty {
  color: #666;
  padding: 2rem;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.theme-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.theme-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.theme-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 600;
  background: #f5f5f5;
  color: #888;
}

.theme-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.theme-desc {
  color: #555;
  font-size: 0.875rem;
  flex: 1;
}

.theme-warning {
  font-size: 0.8rem;
  color: #e65100;
  background: #fff3e0;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

.theme-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-actions {
  display: flex;
  gap: 0.5rem;
}

.theme-version {
  color: #999;
  font-size: 0.8rem;
}

.theme-action {
  padding: 0.4rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.15s ease;
  border: 1px solid;
}

.theme-action:hover:not(:disabled) {
  opacity: 0.9;
}

.theme-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.theme-action.preview {
  background: #fff;
  color: #00897b;
  border-color: #00897b;
}

.theme-action.install {
  background: #6c63ff;
  color: #fff;
  border-color: #6c63ff;
}

.theme-action.uninstall {
  background: #fff;
  color: #e53935;
  border-color: #e53935;
}

.theme-action.settings {
  background: #fff;
  color: #6c63ff;
  border-color: #6c63ff;
}

.theme-action.activate {
  background: #fff;
  color: #0288d1;
  border-color: #0288d1;
}

.notification {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.notification.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

.notification.error {
  background: #fce4ec;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.preview-panel {
  margin-bottom: 2rem;
  padding: 1.25rem 1.5rem;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.preview-panel h2 {
  font-size: 1.1rem;
  margin: 0 0 0.5rem;
}

.preview-hint {
  font-size: 0.8rem;
  color: #666;
  margin: 0 0 1rem;
  line-height: 1.45;
}

.preview-hint code {
  font-size: 0.78rem;
  background: #eee;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.preview-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  background: #fff8e1;
  border: 1px solid #ffcc80;
  border-radius: 8px;
}

.preview-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #ff9800;
  color: #fff;
}

.preview-path {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: #333;
  flex: 1;
  min-width: 12rem;
}

.preview-open-link {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1565c0;
}

.preview-loading {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 1rem;
}

.preview-forms {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-form-block label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #555;
  margin-bottom: 0.35rem;
}

.preview-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.preview-inline-triple .preview-input-narrow {
  max-width: 8rem;
}

.preview-input {
  flex: 1;
  min-width: 10rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.85rem;
}
</style>
