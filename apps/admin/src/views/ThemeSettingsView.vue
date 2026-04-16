<script setup lang="ts">
import type { ThemeSettingsSchema } from '@hana/types'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSection from '../components/theme-settings/SettingsSection.vue'
import { adminFetch } from '../lib/admin-api'

const route = useRoute()
const router = useRouter()

const themeName = computed(() => route.params.name as string)

const schema = ref<ThemeSettingsSchema | null>(null)
/** Flat values map: "sectionKey.fieldKey" → value */
const flatValues = reactive<Record<string, unknown>>({})

const loading = ref(true)
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref(false)

/** Key of the currently expanded section (one at a time). */
const activeSection = ref<string | null>(null)

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown)

  try {
    const res = await adminFetch(`/api/admin/themes/${themeName.value}/settings`)
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
    // Expand the first section by default
    activeSection.value = data.schema?.sections[0]?.key ?? null
  } catch {
    schema.value = null
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (!saving.value && schema.value) saveSettings()
  }
}

function toggleSection(key: string) {
  activeSection.value = activeSection.value === key ? null : key
}

/** Extract values for a single section from the flat map. */
function sectionValues(sectionKey: string): Record<string, unknown> {
  const prefix = `${sectionKey}.`
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flatValues)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value
    }
  }
  return result
}

/** Merge updated section values back into the flat map. */
function updateSectionValues(sectionKey: string, updated: Record<string, unknown>) {
  for (const key of Object.keys(flatValues)) {
    if (key.startsWith(`${sectionKey}.`)) {
      delete flatValues[key]
    }
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
    const res = await adminFetch(`/api/admin/themes/${themeName.value}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: { ...flatValues } }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
    }

    saveSuccess.value = true
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save settings.'
  } finally {
    saving.value = false
  }
}
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

    <div v-if="loading" class="state-message">Loading settings…</div>

    <div v-else-if="!schema" class="state-message empty">
      <span class="empty-icon">⚙</span>
      <p>This theme has no configurable settings schema.</p>
    </div>

    <form v-else @submit.prevent="saveSettings">
      <!-- Save bar — top -->
      <div class="save-bar save-bar-top">
        <div class="save-feedback-wrap">
          <span v-if="saveSuccess" class="save-feedback success" role="status">
            ✓ Saved successfully
          </span>
          <span v-else-if="saveError" class="save-feedback error" role="alert">
            ✗ {{ saveError }}
          </span>
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

      <!-- Save bar — bottom -->
      <div class="save-bar save-bar-bottom">
        <div class="save-feedback-wrap">
          <span v-if="saveSuccess" class="save-feedback success" role="status">
            ✓ Saved successfully
          </span>
          <span v-else-if="saveError" class="save-feedback error" role="alert">
            ✗ {{ saveError }}
          </span>
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

.state-message {
  color: #666;
  padding: 2rem;
  text-align: center;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 2.5rem;
  opacity: 0.3;
}

.empty p {
  margin: 0;
  color: #999;
}

.sections-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* ---- Save bar ---- */
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

.save-feedback.success {
  color: #2e7d32;
}

.save-feedback.error {
  color: #c62828;
}

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

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-btn:not(:disabled):hover {
  opacity: 0.9;
}
</style>
