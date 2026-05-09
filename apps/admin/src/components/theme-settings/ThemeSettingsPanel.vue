<script setup lang="ts">
import type { ThemeSettingsSchema } from '@hanano/types'
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { adminFetch } from '../../lib/admin-api'
import SettingsSection from './SettingsSection.vue'

const props = defineProps<{ themeName: string }>()

const schema = ref<ThemeSettingsSchema | null>(null)
const flatValues = reactive<Record<string, unknown>>({})

const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

const activeSection = ref<string | null>(null)

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(
  () => props.themeName,
  (name) => {
    if (name) loadSettings(name)
  },
  { immediate: true },
)

async function loadSettings(name: string) {
  loading.value = true
  loadError.value = null

  // Clear previous state
  schema.value = null
  for (const key of Object.keys(flatValues)) delete flatValues[key]

  try {
    const res = await adminFetch(`/api/admin/themes/${name}/settings`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    const data = (await res.json()) as {
      schema: ThemeSettingsSchema | null
      values: Record<string, unknown>
    }
    schema.value = data.schema
    Object.assign(flatValues, data.values)
    activeSection.value = data.schema?.sections[0]?.key ?? null
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'Failed to load settings.'
  } finally {
    loading.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!saving.value && schema.value) saveSettings()
  }
}

function toggleSection(key: string) {
  activeSection.value = activeSection.value === key ? null : key
}

function sectionValues(sectionKey: string): Record<string, unknown> {
  const prefix = `${sectionKey}.`
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flatValues)) {
    if (key.startsWith(prefix)) result[key.slice(prefix.length)] = value
  }
  return result
}

function updateSectionValues(sectionKey: string, updated: Record<string, unknown>) {
  for (const key of Object.keys(flatValues)) {
    if (key.startsWith(`${sectionKey}.`)) delete flatValues[key]
  }
  for (const [fieldKey, value] of Object.entries(updated)) {
    flatValues[`${sectionKey}.${fieldKey}`] = value
  }
}

async function saveSettings() {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const res = await adminFetch(`/api/admin/themes/${props.themeName}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { ...flatValues } }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save settings.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="theme-settings-panel">
    <div v-if="loading" class="state-message">Loading settings…</div>

    <div v-else-if="loadError" class="state-message error-state">
      <span class="error-icon">⚠</span>
      <p>{{ loadError }}</p>
    </div>

    <div v-else-if="!schema" class="state-message empty">
      <span class="empty-icon">⚙</span>
      <p>This theme has no configurable settings.</p>
    </div>

    <form v-else @submit.prevent="saveSettings">
      <div class="save-bar save-bar-top">
        <div class="save-feedback-wrap">
          <span v-if="saveSuccess" class="save-feedback success" role="status">✓ Saved successfully</span>
          <span v-else-if="saveError" class="save-feedback error" role="alert">✗ {{ saveError }}</span>
          <span v-else class="save-feedback-hint">Ctrl+S to save</span>
        </div>
        <button type="submit" class="save-btn" :disabled="saving">
          <span v-if="saving">Saving…</span>
          <span v-else>Save Settings</span>
        </button>
      </div>

      <div class="sections-list">
        <SettingsSection
          v-for="section in schema.sections"
          :key="section.key"
          :section="section"
          :values="sectionValues(section.key)"
          :expanded="activeSection === section.key"
          @toggle="toggleSection(section.key)"
          @update:values="updateSectionValues(section.key, $event)"
        />
      </div>

      <div class="save-bar save-bar-bottom">
        <div class="save-feedback-wrap">
          <span v-if="saveSuccess" class="save-feedback success" role="status">✓ Saved successfully</span>
          <span v-else-if="saveError" class="save-feedback error" role="alert">✗ {{ saveError }}</span>
        </div>
        <button type="submit" class="save-btn" :disabled="saving">
          <span v-if="saving">Saving…</span>
          <span v-else>Save Settings</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.theme-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.state-message {
  color: #666;
  padding: 2rem;
  text-align: center;
}

.error-state,
.empty {
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

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.3;
}

.error-state p,
.empty p {
  margin: 0;
  color: #999;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
}

.save-bar-top {
  position: sticky;
  top: 0.5rem;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.save-feedback-wrap {
  flex: 1;
  min-height: 1.2em;
}

.save-feedback {
  font-size: 0.85rem;
}

.save-feedback.success { color: #2e7d32; }
.save-feedback.error   { color: #c62828; }

.save-feedback-hint {
  font-size: 0.78rem;
  color: #bbb;
}

.save-btn {
  padding: 0.5rem 1.5rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.save-btn:not(:disabled):hover { opacity: 0.9; }
</style>
