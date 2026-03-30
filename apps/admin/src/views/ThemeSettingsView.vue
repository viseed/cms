<script setup lang="ts">
import type { ThemeSettingsSchema } from '@hana/types'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsSection from '../components/theme-settings/SettingsSection.vue'

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

onMounted(async () => {
  try {
    const res = await fetch(`/api/admin/themes/${themeName.value}/settings`)
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
  } catch (err) {
    schema.value = null
  } finally {
    loading.value = false
  }
})

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
  // Remove old keys for this section
  for (const key of Object.keys(flatValues)) {
    if (key.startsWith(`${sectionKey}.`)) {
      delete flatValues[key]
    }
  }
  // Write updated keys
  for (const [fieldKey, value] of Object.entries(updated)) {
    flatValues[`${sectionKey}.${fieldKey}`] = value
  }
}

async function saveSettings() {
  saving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    const res = await fetch(`/api/admin/themes/${themeName.value}/settings`, {
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
      <div class="sections-list">
        <SettingsSection
          v-for="section in schema.sections"
          :key="section.key"
          :section="section"
          :values="sectionValues(section.key)"
          @update:values="updateSectionValues(section.key, $event)"
        />
      </div>

      <div class="form-footer">
        <div v-if="saveSuccess" class="save-feedback success" role="status">
          ✓ Settings saved successfully.
        </div>
        <div v-else-if="saveError" class="save-feedback error" role="alert">
          ✗ {{ saveError }}
        </div>
        <div v-else class="save-feedback placeholder" aria-hidden="true" />

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
  gap: 1.5rem;
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
  gap: 1.5rem;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
  gap: 1rem;
}

.save-feedback {
  font-size: 0.875rem;
  flex: 1;
}

.save-feedback.success {
  color: #2e7d32;
}

.save-feedback.error {
  color: #c62828;
}

.save-feedback.placeholder {
  min-height: 1.2em;
}

.save-btn {
  padding: 0.6rem 1.75rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
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
