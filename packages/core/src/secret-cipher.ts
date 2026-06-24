import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/**
 * Reversible secret encryption for storage credentials (e.g. S3/R2
 * `secretAccessKey`). Unlike `Bun.password` (one-way hashing), these secrets
 * must be decrypted at boot to construct storage clients.
 *
 * Algorithm: AES-256-GCM. Stored format: `v1:<iv>:<authTag>:<ciphertext>`
 * (all parts base64). A random IV is generated per encryption.
 */

const ENV_KEY = 'VISEED_ENCRYPTION_KEY'
const VERSION = 'v1'
const IV_BYTES = 12

let cachedKey: Buffer | null = null

/**
 * Derives a 32-byte AES key from the `VISEED_ENCRYPTION_KEY` env var.
 * Throws when the env var is missing — callers must guard this for setups
 * that never store remote secrets (local-only storage).
 */
function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey

  const raw = process.env[ENV_KEY]
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      `${ENV_KEY} is required to encrypt/decrypt media storage secrets. ` +
        'Set it to a strong random string before configuring S3/R2 storage.',
    )
  }

  cachedKey = createHash('sha256').update(raw, 'utf8').digest()
  return cachedKey
}

/** Returns true when an encryption key is configured (without throwing). */
export function hasEncryptionKey(): boolean {
  const raw = process.env[ENV_KEY]
  return Boolean(raw && raw.trim().length > 0)
}

/** Returns true when `value` looks like an output of `encryptSecret`. */
export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(`${VERSION}:`)
}

export function encryptSecret(plain: string): string {
  const key = getMasterKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Invalid encrypted secret format.')
  }

  const key = getMasterKey()
  const iv = Buffer.from(parts[1] as string, 'base64')
  const authTag = Buffer.from(parts[2] as string, 'base64')
  const ciphertext = Buffer.from(parts[3] as string, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plain.toString('utf8')
}
