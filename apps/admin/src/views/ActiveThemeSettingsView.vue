<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ThemeSettingsPanel from '../components/theme-settings/ThemeSettingsPanel.vue'
import { adminFetch } from '../lib/admin-api'

const themeName = ref<string | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    const res = await adminFetch('/api/admin/themes/active')
    if (!res.ok) throw new Error('Could not determine the active theme.')
    const data = (await res.json()) as { name: string } | null
    if (!data?.name) throw new Error('No active theme is configured.')
    themeName.value = data.name
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load active theme.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="active-theme-settings-view">
    <div class="page-header">
      <div class="header-text">
        <h1>Theme Settings</h1>
        <p v-if="themeName" class="subtitle">
          Active theme: <strong>{{ themeName }}</strong> — changes apply after save.
        </p>
        <p v-else class="subtitle">Configure the active theme.</p>
      </div>
    </div>

    <div v-if="loading" class="state-message">Loading…</div>

    <div v-else-if="loadError" class="state-message error-state">
      <span class="error-icon">⚠</span>
      <p>{{ loadError }}</p>
    </div>

    <ThemeSettingsPanel v-else-if="themeName" :theme-name="themeName" />
  </div>
</template>

<style scoped>
.active-theme-settings-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: flex-start;
}

.header-text h1 {
  font-size: 1.75rem;
  margin: 0;
}

.subtitle {
  color: #666;
  margin: 0.25rem 0 0;
}

.state-message {
  color: #666;
  padding: 2rem;
  text-align: center;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
}

.error-icon {
  font-size: 2rem;
  color: #c62828;
}

.error-state p {
  margin: 0;
  color: #999;
}
</style>
