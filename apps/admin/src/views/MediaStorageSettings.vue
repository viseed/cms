<template>
  <div class="storage-settings">
    <div class="settings-intro">
      <h2>Storage Provider</h2>
      <p class="subtitle">
        Choose where uploaded media files are stored. Old media will not be moved automatically.
      </p>
    </div>

    <div v-if="loading" class="settings-loading">Loading current configuration…</div>

    <template v-else>
      <div
        class="encrypt-key-banner"
        :class="encryptionKeyConfigured ? 'configured' : 'missing'"
      >
        <template v-if="encryptionKeyConfigured">
        </template>
        <template v-else>
          <span class="key-icon">⚠️</span>
          <span>
            Encryption key is not set. S3 and R2 storage require an encryption key to protect
            credentials at rest.
          </span>
          <button
            type="button"
            class="generate-key-btn"
            :disabled="generatingKey"
            @click="generateKey"
          >
            <span v-if="generatingKey">Generating…</span>
            <span v-else>Generate Key</span>
          </button>
        </template>
      </div>

    <form class="settings-form" @submit.prevent="save">
      <div class="form-group">
        <label class="form-label" for="storage-type">Provider</label>
        <select id="storage-type" v-model="type" class="form-input" @change="onProviderChange">
          <option v-for="provider in providerOptions" :key="provider.type" :value="provider.type">
            {{ provider.label }}
          </option>
        </select>
        <p v-if="providers.length === 0" class="form-hint">
          No additional storage providers installed. Install a plugin (e.g. plugin-s3, plugin-r2) to
          enable remote storage.
        </p>
      </div>

      <div v-if="unavailableType" class="settings-banner error">
        The saved provider "{{ unavailableType }}" is not available. Install or enable its plugin, or
        pick another provider below.
      </div>

      <div v-for="field in activeFields" :key="field.name" class="form-group">
        <label class="form-label" :for="`field-${field.name}`">
          {{ field.label }}
          <span v-if="!field.required" class="optional">(optional)</span>
        </label>
        <input
          :id="`field-${field.name}`"
          v-model="values[field.name]"
          :type="field.type === 'password' ? 'password' : 'text'"
          class="form-input"
          :placeholder="field.placeholder"
          :autocomplete="field.type === 'password' ? 'new-password' : 'off'"
          @focus="onFieldFocus(field)"
        />
        <p v-if="field.hint" class="form-hint">{{ field.hint }}</p>
      </div>

      <div v-if="message" class="settings-banner" :class="messageType">{{ message }}</div>

      <div class="form-actions">
        <button
          v-if="type !== 'local'"
          type="button"
          class="test-btn"
          :disabled="testing || saving"
          @click="testConnection"
        >
          <span v-if="testing">Testing…</span>
          <span v-else>Test Connection</span>
        </button>
        <button type="submit" class="save-btn" :disabled="saving || testing">
          <span v-if="saving">Saving…</span>
          <span v-else>Save</span>
        </button>
      </div>
    </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { adminFetch } from '../lib/admin-api'

interface ProviderField {
  name: string
  label: string
  type: 'text' | 'password'
  required?: boolean
  secret?: boolean
  placeholder?: string
  hint?: string
}

interface ProviderDef {
  type: string
  label: string
  fields: ProviderField[]
}

const SECRET_MASK = '***'

const LOCAL_PROVIDER: ProviderDef = {
  type: 'local',
  label: 'Local filesystem',
  fields: [
    {
      name: 'uploadDir',
      label: 'Upload directory',
      type: 'text',
      placeholder: './uploads',
      hint: 'Relative or absolute path on the server. Defaults to ./uploads.',
    },
  ],
}

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const generatingKey = ref(false)
const encryptionKeyConfigured = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const type = ref('local')
const providers = ref<ProviderDef[]>([])
const values = reactive<Record<string, string>>({})
// Tracks secret fields still holding the masked server value, so we clear them
// on first focus and avoid re-sending the mask accidentally.
const maskedSecrets = reactive<Record<string, boolean>>({})
const unavailableType = ref('')
// Server-loaded config per provider type — restored when user switches back.
const serverConfigs = new Map<string, Record<string, unknown>>()

const allProviders = computed<ProviderDef[]>(() => [LOCAL_PROVIDER, ...providers.value])

const providerOptions = computed<ProviderDef[]>(() => {
  if (unavailableType.value) {
    return [
      ...allProviders.value,
      { type: unavailableType.value, label: `${unavailableType.value} (plugin not available)`, fields: [] },
    ]
  }
  return allProviders.value
})

const activeProvider = computed<ProviderDef | undefined>(() =>
  allProviders.value.find((p) => p.type === type.value),
)

const activeFields = computed<ProviderField[]>(() => activeProvider.value?.fields ?? [])

function setMessage(text: string, kind: 'success' | 'error') {
  message.value = text
  messageType.value = kind
}

function resetValues(forType: string, config: Record<string, unknown> = {}) {
  for (const key of Object.keys(values)) delete values[key]
  for (const key of Object.keys(maskedSecrets)) delete maskedSecrets[key]

  const provider = allProviders.value.find((p) => p.type === forType)
  if (!provider) return

  for (const field of provider.fields) {
    const raw = config[field.name]
    const value = typeof raw === 'string' ? raw : ''
    values[field.name] = value
    if (field.secret) maskedSecrets[field.name] = value === SECRET_MASK
  }
}

function onProviderChange() {
  unavailableType.value = ''
  message.value = ''
  resetValues(type.value, serverConfigs.get(type.value) ?? {})
}

function onFieldFocus(field: ProviderField) {
  if (field.secret && maskedSecrets[field.name]) {
    values[field.name] = ''
    maskedSecrets[field.name] = false
  }
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = { type: type.value }
  for (const field of activeFields.value) {
    payload[field.name] = (values[field.name] ?? '').trim()
  }
  // Preserve the exact masked secret (do not trim the mask away).
  for (const field of activeFields.value) {
    if (field.secret && maskedSecrets[field.name]) payload[field.name] = SECRET_MASK
  }
  return payload
}

async function loadEncryptionKeyStatus() {
  try {
    const res = await adminFetch('/api/admin/media/encryption-key/status')
    if (!res.ok) return
    const data = await res.json()
    encryptionKeyConfigured.value = !!data.configured
  } catch {
    // non-critical — silently ignore
  }
}

async function generateKey() {
  generatingKey.value = true
  message.value = ''
  try {
    const res = await adminFetch('/api/admin/media/encryption-key/generate', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Failed (${res.status})`)
    encryptionKeyConfigured.value = true
    setMessage('Encryption key generated and saved to .env.', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : 'Failed to generate key', 'error')
  } finally {
    generatingKey.value = false
  }
}

async function loadProviders() {
  try {
    const res = await adminFetch('/api/admin/media/storage-config/providers')
    if (!res.ok) return
    const data = await res.json()
    providers.value = Array.isArray(data.providers) ? data.providers : []
  } catch {
    providers.value = []
  }
}

async function loadConfig() {
  const res = await adminFetch('/api/admin/media/storage-config')
  if (!res.ok) throw new Error(`Failed to load configuration (${res.status})`)
  const data = await res.json()
  const savedType: string = data.type ?? 'local'
  const config: Record<string, unknown> = data.config ?? {}

  // Populate serverConfigs for every provider returned by the server so that
  // switching providers restores previously saved values without a round-trip.
  const allConfigsFromServer = data.allConfigs as Record<string, Record<string, unknown>> | undefined
  if (allConfigsFromServer && typeof allConfigsFromServer === 'object') {
    for (const [providerType, providerConfig] of Object.entries(allConfigsFromServer)) {
      serverConfigs.set(providerType, providerConfig)
    }
  } else {
    serverConfigs.set(savedType, config)
  }

  if (!allProviders.value.some((p) => p.type === savedType)) {
    unavailableType.value = savedType
  }
  type.value = savedType
  resetValues(savedType, config)
}

async function load() {
  loading.value = true
  try {
    await Promise.all([loadProviders(), loadEncryptionKeyStatus()])
    await loadConfig()
  } catch (err) {
    setMessage(err instanceof Error ? err.message : 'Failed to load configuration', 'error')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    const res = await adminFetch('/api/admin/media/storage-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`)
    unavailableType.value = ''
    type.value = data.type ?? type.value
    const savedConfig: Record<string, unknown> = data.config ?? {}
    const allConfigsFromServer = data.allConfigs as Record<string, Record<string, unknown>> | undefined
    if (allConfigsFromServer && typeof allConfigsFromServer === 'object') {
      for (const [providerType, providerConfig] of Object.entries(allConfigsFromServer)) {
        serverConfigs.set(providerType, providerConfig)
      }
    } else {
      serverConfigs.set(type.value, savedConfig)
    }
    resetValues(type.value, savedConfig)
    setMessage('Storage configuration saved.', 'success')
  } catch (err) {
    setMessage(err instanceof Error ? err.message : 'Save failed', 'error')
  } finally {
    saving.value = false
  }
}

async function testConnection() {
  testing.value = true
  message.value = ''
  try {
    const res = await adminFetch('/api/admin/media/storage-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? `Test failed (${res.status})`)
    if (data.ok) {
      setMessage('Connection successful.', 'success')
    } else {
      setMessage(data.error ?? 'Connection failed.', 'error')
    }
  } catch (err) {
    setMessage(err instanceof Error ? err.message : 'Test failed', 'error')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.storage-settings {
  max-width: 640px;
}

.settings-intro h2 {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
}

.subtitle {
  margin: 0 0 1.5rem;
  color: var(--text-secondary, #6b7280);
  font-size: 0.9rem;
}

.settings-loading {
  color: var(--text-secondary, #6b7280);
  padding: 1rem 0;
}

.form-group {
  margin-bottom: 1.1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.35rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.optional {
  color: var(--text-secondary, #9ca3af);
  font-weight: 400;
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color, #d1d5db);
  border-radius: 6px;
  font-size: 0.9rem;
  background: var(--surface, #fff);
  color: inherit;
  box-sizing: border-box;
}

.form-hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--text-secondary, #9ca3af);
}

.settings-banner {
  padding: 0.65rem 0.8rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.settings-banner.success {
  background: #ecfdf5;
  color: #065f46;
}

.settings-banner.error {
  background: #fef2f2;
  color: #991b1b;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.test-btn,
.save-btn {
  padding: 0.55rem 1.1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
}

.test-btn {
  background: var(--surface, #fff);
  border-color: var(--border-color, #d1d5db);
  color: inherit;
}

.save-btn {
  background: var(--primary, #2563eb);
  color: #fff;
}

.test-btn:disabled,
.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.encrypt-key-banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.8rem;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.encrypt-key-banner.configured {
  /* background: #ecfdf5; */
  /* color: #065f46; */
  display: none;
}

.encrypt-key-banner.missing {
  background: #fffbeb;
  color: #92400e;
}

.key-icon {
  flex-shrink: 0;
}

.generate-key-btn {
  margin-left: auto;
  padding: 0.35rem 0.8rem;
  border: 1px solid #d97706;
  border-radius: 6px;
  background: #fff;
  color: #92400e;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}

.generate-key-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
