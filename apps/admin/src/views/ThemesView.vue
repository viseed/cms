<script setup lang="ts">
import { ref, onMounted } from 'vue'

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

onMounted(async () => {
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
})
</script>

<template>
  <div class="themes-view">
    <h1>Theme Catalog</h1>
    <p class="subtitle">Installed themes and their status</p>

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
          <span v-if="theme.installed" class="theme-status installed">Installed</span>
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

.theme-version {
  color: #999;
  font-size: 0.8rem;
}

.theme-status {
  font-size: 0.75rem;
  font-weight: 600;
}

.theme-status.installed {
  color: #2e7d32;
}
</style>
