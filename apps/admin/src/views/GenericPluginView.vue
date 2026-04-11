<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pluginName = computed(() => (route.meta.pluginName as string) ?? 'Unknown Plugin')
const label = computed(() => (route.meta.navigation as { label: string })?.label ?? route.path)
</script>

<template>
  <div class="generic-plugin-view">
    <h1>{{ label }}</h1>
    <p class="subtitle">Provided by <strong>{{ pluginName }}</strong></p>
    <div class="placeholder">
      <p>Custom admin UI is not available for this plugin.</p>
      <p class="hint">The plugin registered this menu entry but does not ship an admin bundle.</p>
    </div>
  </div>
</template>

<style scoped>
.generic-plugin-view h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
.subtitle { color: #666; margin-bottom: 2rem; }
.placeholder {
  background: #fff; padding: 3rem; border-radius: 12px; text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.placeholder p { color: #999; margin: 0.5rem 0; }
.hint { font-size: 0.875rem; }
</style>
