import { mediaStorageConfig } from '@viseed/schema'
import type { MediaStorageConfig } from '@viseed/types'
import { eq } from 'drizzle-orm'
import type { Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import { createStorageAdapter, type StorageConfig } from '../media-storage'
import {
  maskStoredConfig,
  prepareConfigForStorage,
  resolveStoredConfig,
  SECRET_MASK,
  type StorageConfigPayload,
} from '../media-storage-config'
import type { StorageProviderRegistry } from '../storage-provider-registry'
import type { RegisterAdminRoute } from './auth'

const ROW_ID = 'default'

export interface AdminMediaStorageContext {
  getDatabase: () => DatabaseInstance
  /** Hot-swaps the in-memory storage adapter with the resolved (decrypted) config. */
  applyConfig: (resolved: MediaStorageConfig) => void
  /** Provides the plugin-contributed storage providers (built fresh each call). */
  getProviderRegistry: () => StorageProviderRegistry
}

type ParseResult = { ok: true; value: MediaStorageConfig } | { ok: false; error: string }

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Validates and normalizes an incoming config body against the field schema of
 * the selected provider. Only declared fields are persisted, so unknown keys
 * are ignored and each provider fully controls its own parameters.
 */
function parseConfigInput(
  body: Record<string, unknown>,
  registry: StorageProviderRegistry,
): ParseResult {
  const type = asString(body.type)

  if (type === 'local') {
    const uploadDir = asString(body.uploadDir)
    return { ok: true, value: { type: 'local', uploadDir: uploadDir || undefined } }
  }

  const provider = registry.get(type)
  if (!provider) {
    return { ok: false, error: `Unsupported storage type "${type}".` }
  }

  const values: Record<string, unknown> = {}
  for (const field of provider.fields) {
    const raw = body[field.name]
    const isSecret = field.secret === true
    const value = typeof raw === 'string' ? (isSecret ? raw : raw.trim()) : ''
    // A masked secret means "keep the stored value" and counts as present.
    const present = isSecret ? value === SECRET_MASK || value.length > 0 : value.length > 0

    if (field.required && !present) {
      return { ok: false, error: `Field "${field.label}" is required.` }
    }
    if (present) values[field.name] = value
  }

  return { ok: true, value: { type, ...values } }
}

async function readBody(c: Parameters<Handler>[0]): Promise<Record<string, unknown> | null> {
  try {
    const body = await c.req.json()
    if (typeof body !== 'object' || body === null) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

async function loadStoredRow(
  db: DatabaseInstance,
): Promise<{ type: string; config: StorageConfigPayload } | null> {
  const [row] = await db.select().from(mediaStorageConfig).where(eq(mediaStorageConfig.id, ROW_ID))
  if (!row) return null
  return { type: row.type, config: (row.config as StorageConfigPayload) ?? {} }
}

function handleGet(ctx: AdminMediaStorageContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const stored = await loadStoredRow(db)
    const type = stored?.type ?? 'local'
    const config = stored?.config ?? {}
    const secretFields = ctx.getProviderRegistry().secretFieldsOf(type)
    return c.json({ type, config: maskStoredConfig(config, secretFields) })
  }
}

function handleProviders(ctx: AdminMediaStorageContext): Handler {
  return (c) => {
    const providers = ctx
      .getProviderRegistry()
      .list()
      .map((provider) => ({
        type: provider.type,
        label: provider.label,
        fields: provider.fields,
      }))
    return c.json({ providers })
  }
}

function handlePut(ctx: AdminMediaStorageContext): Handler {
  return async (c) => {
    const body = await readBody(c)
    if (!body) return c.json({ error: 'Invalid JSON body.' }, 400)

    const registry = ctx.getProviderRegistry()
    const parsed = parseConfigInput(body, registry)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const db = ctx.getDatabase()
    const existing = await loadStoredRow(db)
    const secretFields = registry.secretFieldsOf(parsed.value.type)

    let stored: { type: string; config: StorageConfigPayload }
    try {
      stored = prepareConfigForStorage(parsed.value, secretFields, existing?.config)
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }

    const now = new Date()
    if (existing) {
      await db
        .update(mediaStorageConfig)
        .set({ type: stored.type, config: stored.config, updatedAt: now })
        .where(eq(mediaStorageConfig.id, ROW_ID))
    } else {
      await db
        .insert(mediaStorageConfig)
        .values({ id: ROW_ID, type: stored.type, config: stored.config, updatedAt: now })
    }

    try {
      ctx.applyConfig(resolveStoredConfig(stored.type, stored.config, secretFields))
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }

    return c.json({ type: stored.type, config: maskStoredConfig(stored.config, secretFields) })
  }
}

function handleTest(ctx: AdminMediaStorageContext): Handler {
  return async (c) => {
    const body = await readBody(c)
    if (!body) return c.json({ error: 'Invalid JSON body.' }, 400)

    const registry = ctx.getProviderRegistry()
    const parsed = parseConfigInput(body, registry)
    if (!parsed.ok) return c.json({ error: parsed.error }, 400)

    const db = ctx.getDatabase()
    const existing = await loadStoredRow(db)
    const secretFields = registry.secretFieldsOf(parsed.value.type)

    let resolved: MediaStorageConfig
    try {
      const stored = prepareConfigForStorage(parsed.value, secretFields, existing?.config)
      resolved = resolveStoredConfig(stored.type, stored.config, secretFields)
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 200)
    }

    try {
      const adapter = createStorageAdapter(resolved as StorageConfig, registry)
      const key = `__viseed_test__/${Date.now()}.txt`
      const data = new TextEncoder().encode('viseed storage connection test').buffer
      const savedPath = await adapter.save(key, data, 'default', 'text/plain')
      await adapter.delete(savedPath)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ ok: false, error: (err as Error).message }, 200)
    }
  }
}

export function registerMediaStorageRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminMediaStorageContext,
): void {
  registerRoute('GET', '/media/storage-config', 'platform.sites.read', handleGet(context))
  registerRoute(
    'GET',
    '/media/storage-config/providers',
    'platform.sites.read',
    handleProviders(context),
  )
  registerRoute('PUT', '/media/storage-config', 'platform.sites.manage', handlePut(context))
  registerRoute('POST', '/media/storage-config/test', 'platform.sites.manage', handleTest(context))
}
