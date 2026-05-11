import { randomUUID } from 'node:crypto'
import { widgets } from '@viseed/schema'
import type { CMSPlugin, RequestContext } from '@viseed/types'
import { and, eq, ilike } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import type { PluginRouteRegistry } from '../plugin-route-registry'
import type { WidgetTypeRegistry } from '../widget-type-registry'
import type { RegisterAdminRoute } from './auth'

export interface AdminWidgetContext {
  getDatabase: () => DatabaseInstance
  plugins: CMSPlugin[]
  pluginRegistry: PluginRouteRegistry
  widgetTypeRegistry: WidgetTypeRegistry
  resolveRequestContext: (c: Context) => RequestContext
}

function handleListWidgetTypes(ctx: AdminWidgetContext): Handler {
  return (c) => {
    const types = ctx.widgetTypeRegistry.list().map((t) => ({
      ...t,
      pluginEnabled: ctx.pluginRegistry.isActive(t.pluginName),
      hasPublicBundle: !!ctx.plugins.find((p) => p.name === t.pluginName)?.public?.bundlePath,
    }))
    return c.json({ types })
  }
}

function handleListWidgets(ctx: AdminWidgetContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const requestContext = ctx.resolveRequestContext(c)
    const siteId = requestContext.site.id

    const typeFilter = c.req.query('type')
    const search = c.req.query('q')

    const conditions = [eq(widgets.siteId, siteId)]
    if (typeFilter) conditions.push(eq(widgets.type, typeFilter))
    if (search) conditions.push(ilike(widgets.name, `%${search}%`))

    const rows = await db
      .select()
      .from(widgets)
      .where(and(...conditions))
      .orderBy(widgets.updatedAt)

    return c.json(
      rows.map((r) => ({
        ...r,
        typeLabel: ctx.widgetTypeRegistry.get(r.type)?.label ?? r.type,
        typeAvailable: ctx.widgetTypeRegistry.has(r.type),
      })),
    )
  }
}

function handleGetWidget(ctx: AdminWidgetContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const requestContext = ctx.resolveRequestContext(c)
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'Widget id is required.' }, 400)

    const [row] = await db
      .select()
      .from(widgets)
      .where(and(eq(widgets.id, id), eq(widgets.siteId, requestContext.site.id)))

    if (!row) return c.json({ error: 'Widget not found.' }, 404)

    return c.json({
      ...row,
      typeLabel: ctx.widgetTypeRegistry.get(row.type)?.label ?? row.type,
      typeAvailable: ctx.widgetTypeRegistry.has(row.type),
    })
  }
}

function handleCreateWidget(ctx: AdminWidgetContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    if (typeof body !== 'object' || body === null) {
      return c.json({ error: 'Body must be an object.' }, 400)
    }

    const { name, type, config } = body as Record<string, unknown>

    if (typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'Field "name" is required.' }, 400)
    }
    if (typeof type !== 'string' || !type.trim()) {
      return c.json({ error: 'Field "type" is required.' }, 400)
    }
    if (!ctx.widgetTypeRegistry.has(type)) {
      return c.json({ error: `Widget type "${type}" is not registered or plugin is inactive.` }, 400)
    }

    const requestContext = ctx.resolveRequestContext(c)
    const db = ctx.getDatabase()
    const id = randomUUID()
    const now = new Date()

    const widgetTypeDef = ctx.widgetTypeRegistry.get(type)
    const resolvedConfig =
      config && typeof config === 'object' ? config : (widgetTypeDef?.defaultConfig ?? {})

    await db.insert(widgets).values({
      id,
      siteId: requestContext.site.id,
      name: name.trim(),
      type,
      config: resolvedConfig,
      createdBy: requestContext.actor?.id ?? null,
      createdAt: now,
      updatedAt: now,
    })

    const [row] = await db.select().from(widgets).where(eq(widgets.id, id))
    return c.json(row, 201)
  }
}

function handleUpdateWidget(ctx: AdminWidgetContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    if (typeof body !== 'object' || body === null) {
      return c.json({ error: 'Body must be an object.' }, 400)
    }

    const requestContext = ctx.resolveRequestContext(c)
    const db = ctx.getDatabase()
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'Widget id is required.' }, 400)

    const [existing] = await db
      .select()
      .from(widgets)
      .where(and(eq(widgets.id, id), eq(widgets.siteId, requestContext.site.id)))

    if (!existing) return c.json({ error: 'Widget not found.' }, 404)

    const { name, config } = body as Record<string, unknown>

    const updates: Partial<typeof existing> = { updatedAt: new Date() }
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (config && typeof config === 'object') updates.config = config

    await db.update(widgets).set(updates).where(eq(widgets.id, existing.id))

    const [updated] = await db.select().from(widgets).where(eq(widgets.id, existing.id))
    return c.json(updated)
  }
}

function handleDeleteWidget(ctx: AdminWidgetContext): Handler {
  return async (c) => {
    const requestContext = ctx.resolveRequestContext(c)
    const db = ctx.getDatabase()
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'Widget id is required.' }, 400)

    const [existing] = await db
      .select()
      .from(widgets)
      .where(and(eq(widgets.id, id), eq(widgets.siteId, requestContext.site.id)))

    if (!existing) return c.json({ error: 'Widget not found.' }, 404)

    await db.delete(widgets).where(eq(widgets.id, existing.id))
    return c.json({ message: 'Widget deleted.' })
  }
}

export function registerWidgetRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminWidgetContext,
): void {
  registerRoute('GET', '/widget-types', 'site.widgets.read', handleListWidgetTypes(context))
  registerRoute('GET', '/widgets', 'site.widgets.read', handleListWidgets(context))
  registerRoute('GET', '/widgets/:id', 'site.widgets.read', handleGetWidget(context))
  registerRoute('POST', '/widgets', 'site.widgets.manage', handleCreateWidget(context))
  registerRoute('PUT', '/widgets/:id', 'site.widgets.manage', handleUpdateWidget(context))
  registerRoute('DELETE', '/widgets/:id', 'site.widgets.manage', handleDeleteWidget(context))
}
