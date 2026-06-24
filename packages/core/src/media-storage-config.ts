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
