<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

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

async function loadThemes() {
  try {
    const res = await fetch('/api/admin/themes')
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
}

onMounted(loadThemes)

function showNotification(type: 'success' | 'error', text: string) {
  notification.value = { type, text }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

async function installTheme(theme: ThemeItem) {
  actionLoading.value = theme.name
  try {
    const res = await fetch(`/api/admin/themes/${theme.name}/install`, { method: 'POST' })
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
    const res = await fetch(`/api/admin/themes/${theme.name}/uninstall`, { method: 'POST' })
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

async function activateTheme(theme: ThemeItem) {
  actionLoading.value = theme.name
  try {
    const res = await fetch(`/api/admin/themes/${theme.name}/activate`, { method: 'POST' })
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
</style>
