<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface PluginItem {
  name: string
  version: string
  description: string
  installed: boolean
  type: 'official' | 'community'
}

const plugins = ref<PluginItem[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/admin/plugins')
    if (res.ok) {
      plugins.value = await res.json()
    }
  } catch {
    // API not available during static dev
    plugins.value = [
      {
        name: '@hana/plugin-auth',
        version: '0.1.0',
        description: 'Authentication & session management',
        installed: true,
        type: 'official',
      },
      {
        name: '@hana/plugin-blog',
        version: '0.1.0',
        description: 'Blog posts & categories',
        installed: true,
        type: 'official',
      },
      {
        name: '@hana/plugin-media',
        version: '0.1.0',
        description: 'File upload & media management',
        installed: false,
        type: 'official',
      },
    ]
  } finally {
    loading.value = false
  }
})

async function togglePlugin(plugin: PluginItem) {
  if (plugin.installed) {
    await fetch(`/api/admin/plugins/${plugin.name}/uninstall`, { method: 'POST' })
    plugin.installed = false
  } else {
    await fetch(`/api/admin/plugins/${plugin.name}/install`, { method: 'POST' })
    plugin.installed = true
  }
}
</script>

<template>
  <div class="plugins-view">
    <h1>Plugin Marketplace</h1>
    <p class="subtitle">Browse and manage plugins</p>

    <div v-if="loading" class="loading">Loading plugins...</div>

    <div v-else class="plugins-grid">
      <div v-for="plugin in plugins" :key="plugin.name" class="plugin-card">
        <div class="plugin-header">
          <span class="plugin-name">{{ plugin.name }}</span>
          <span class="plugin-badge" :class="plugin.type">{{ plugin.type }}</span>
        </div>
        <p class="plugin-desc">{{ plugin.description }}</p>
        <div class="plugin-footer">
          <span class="plugin-version">v{{ plugin.version }}</span>
          <button
            class="plugin-action"
            :class="{ installed: plugin.installed }"
            @click="togglePlugin(plugin)"
          >
            {{ plugin.installed ? 'Uninstall' : 'Install' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plugins-view h1 {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.loading {
  color: #666;
  padding: 2rem;
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.plugin-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plugin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.plugin-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 600;
}

.plugin-badge.official {
  background: #e8f5e9;
  color: #2e7d32;
}

.plugin-badge.community {
  background: #e3f2fd;
  color: #1565c0;
}

.plugin-desc {
  color: #555;
  font-size: 0.875rem;
  flex: 1;
}

.plugin-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-version {
  color: #999;
  font-size: 0.8rem;
}

.plugin-action {
  padding: 0.4rem 1rem;
  border: 1px solid #6c63ff;
  border-radius: 6px;
  background: #6c63ff;
  color: #fff;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.plugin-action:hover {
  opacity: 0.9;
}

.plugin-action.installed {
  background: #fff;
  color: #e53935;
  border-color: #e53935;
}
</style>
