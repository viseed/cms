import type { MediaStorageConfig } from '@viseed/types'
import { decryptSecret, encryptSecret, isEncryptedSecret } from './secret-cipher'

/** Placeholder returned to clients instead of the real secret. */
export const SECRET_MASK = '***'

export type StorageConfigPayload = Record<string, unknown>

export interface StoredStorageRow {
  type: string
  config: StorageConfigPayload
}

/**
 * Internal DB format: a versioned envelope that holds one config object per
 * provider type, so switching active providers never discards other providers'
 * saved configs.
 */
interface ProviderConfigStore {
  _v: 2
  configs: Record<string, StorageConfigPayload>
}

/**
 * Reads the per-provider config map from a raw DB `config` value.
 * Handles the legacy flat format (single provider config) by migrating it into
 * the new envelope keyed by the active provider type.
 */
export function readProviderConfigs(
  raw: StorageConfigPayload,
  activeType: string,
): Record<string, StorageConfigPayload> {
  const store = raw as unknown as ProviderConfigStore
  if (store._v === 2 && store.configs && typeof store.configs === 'object') {
    return { ...store.configs }
  }
  // Legacy flat format: the whole object is the config for the active provider.
  return activeType ? { [activeType]: raw } : {}
}

/** Encodes a per-provider config map into the DB storage envelope. */
export function writeProviderConfigs(
  configs: Record<string, StorageConfigPayload>,
): StorageConfigPayload {
  return { _v: 2, configs } as unknown as StorageConfigPayload
}

/**
 * Builds a runtime (decrypted) `MediaStorageConfig` from a persisted DB row.
 * Secret fields (declared by the provider via `secret: true`) are decrypted
 * exactly once — callers should cache the resulting adapter rather than calling
 * this per request.
 */
export function resolveStoredConfig(
  type: string,
  config: StorageConfigPayload,
  secretFields: string[],
): MediaStorageConfig {
  if (type === 'local') {
    return {
      type: 'local',
      uploadDir: typeof config.uploadDir === 'string' ? config.uploadDir : undefined,
    }
  }

  const resolved: StorageConfigPayload = { ...config }
  for (const field of secretFields) {
    const value = resolved[field]
    if (typeof value === 'string' && value) {
      resolved[field] = isEncryptedSecret(value) ? decryptSecret(value) : value
    }
  }
  return { ...resolved, type } as MediaStorageConfig
}

/**
 * Prepares a config for persistence. Secret fields are encrypted before
 * storage. When an incoming secret equals the mask, the previously stored
 * (encrypted) secret is preserved so clients can update other fields without
 * re-entering it.
 */
export function prepareConfigForStorage(
  input: MediaStorageConfig,
  secretFields: string[],
  previousConfig?: StorageConfigPayload,
): StoredStorageRow {
  if (input.type === 'local') {
    return {
      type: 'local',
      config: input.uploadDir ? { uploadDir: input.uploadDir } : {},
    }
  }

  const { type, ...rest } = input as { type: string } & StorageConfigPayload
  const config: StorageConfigPayload = { ...rest }

  for (const field of secretFields) {
    const value = config[field]
    if (value === SECRET_MASK) {
      const previous = previousConfig?.[field]
      config[field] = typeof previous === 'string' ? previous : ''
    } else if (typeof value === 'string' && value) {
      config[field] = encryptSecret(value)
    }
  }

  return { type, config }
}

/** Replaces secret fields with a mask for safe API responses. */
export function maskStoredConfig(
  config: StorageConfigPayload,
  secretFields: string[],
): StorageConfigPayload {
  const masked: StorageConfigPayload = { ...config }
  for (const field of secretFields) {
    masked[field] = masked[field] ? SECRET_MASK : ''
  }
  return masked
}
