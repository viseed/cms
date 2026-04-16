<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ThemeSettingsPanel from '../components/theme-settings/ThemeSettingsPanel.vue'

const route = useRoute()
const router = useRouter()

const themeName = computed(() => route.params.name as string)
</script>

<template>
  <div class="theme-settings-view">
    <div class="page-header">
      <button class="back-btn" @click="router.push('/themes')">← Themes</button>
      <div class="header-text">
        <h1>{{ themeName }} Settings</h1>
        <p class="subtitle">Configure theme settings — changes apply after save.</p>
      </div>
    </div>

    <ThemeSettingsPanel :theme-name="themeName" />
  </div>
</template>

<style scoped>
.theme-settings-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 800px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #555;
  white-space: nowrap;
  margin-top: 0.2rem;
  transition: all 0.15s;
}

.back-btn:hover {
  border-color: #6c63ff;
  color: #6c63ff;
}

.header-text h1 {
  font-size: 1.75rem;
  margin: 0;
}

.subtitle {
  color: #666;
  margin: 0.25rem 0 0;
}
</style>
