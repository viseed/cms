import { randomUUID } from 'node:crypto'
import { dashboardWidgets } from '@viseed/schema'
import type { RequestContext } from '@viseed/types'
import { and, asc, eq, inArray, max } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import type { DashboardWidgetRegistry } from '../dashboard-widget-registry'
import type { PluginRouteRegistry } from '../plugin-route-registry'
import type { RegisterAdminRoute } from './auth'

export interface AdminDashboardWidgetContext {
  getDatabase: () => DatabaseInstance
  pluginRegistry: PluginRouteRegistry
  dashboardWidgetRegistry: DashboardWidgetRegistry
  resolveRequestContext: (c: Context) => RequestContext
}

function handleListDashboardWidgetTypes(ctx: AdminDashboardWidgetContext): Handler {
  return (c) => {
    const types = ctx.dashboardWidgetRegistry.list().map((w) => ({
      ...w,
      pluginEnabled: ctx.pluginRegistry.isActive(w.pluginName),
    }))
    return c.json({ types })
  }
}

function handleListDashboardWidgets(ctx: AdminDashboardWidgetContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const siteId = ctx.resolveRequestContext(c).site.id

    const rows = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.siteId, siteId))
      .orderBy(asc(dashboardWidgets.position))

    return c.json(
      rows.map((r) => {
        const def = ctx.dashboardWidgetRegistry.get(r.type)
        return {
          ...r,
          label: def?.label ?? r.type,
          icon: def?.icon ?? null,
          pluginName: def?.pluginName ?? null,
          component: def?.component ?? null,
          supportedSizes: def?.supportedSizes ?? [],
          available: !!def && ctx.pluginRegistry.isActive(def.pluginName),
        }
      }),
    )
  }
}

function handleCreateDashboardWidget(ctx: AdminDashboardWidgetContext): Handler {
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

    const { type, size } = body as Record<string, unknown>

    if (typeof type !== 'string' || !type.trim()) {
      return c.json({ error: 'Field "type" is required.' }, 400)
    }

    const def = ctx.dashboardWidgetRegistry.get(type)
    if (!def) {
      return c.json({ error: `Dashboard widget "${type}" is not registered or plugin is inactive.` }, 400)
    }

    const resolvedSize = typeof size === 'string' && size ? size : def.defaultSize
    if (!def.supportedSizes.includes(resolvedSize as (typeof def.supportedSizes)[number])) {
      return c.json({ error: `Size "${resolvedSize}" is not supported by this widget.` }, 400)
    }

    const db = ctx.getDatabase()
    const siteId = ctx.resolveRequestContext(c).site.id

    const [{ value: maxPosition } = { value: null }] = await db
      .select({ value: max(dashboardWidgets.position) })
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.siteId, siteId))

    const id = randomUUID()
    const now = new Date()

    await db.insert(dashboardWidgets).values({
      id,
      siteId,
      type,
      size: resolvedSize,
      position: (maxPosition ?? -1) + 1,
      createdAt: now,
      updatedAt: now,
    })

    const [row] = await db.select().from(dashboardWidgets).where(eq(dashboardWidgets.id, id))
    return c.json(row, 201)
  }
}

function handleUpdateDashboardWidget(ctx: AdminDashboardWidgetContext): Handler {
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

    const db = ctx.getDatabase()
    const siteId = ctx.resolveRequestContext(c).site.id
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'Dashboard widget id is required.' }, 400)

    const [existing] = await db
      .select()
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardWidgets.siteId, siteId)))

    if (!existing) return c.json({ error: 'Dashboard widget not found.' }, 404)

    const { size } = body as Record<string, unknown>
    if (typeof size !== 'string' || !size) {
      return c.json({ error: 'Field "size" is required.' }, 400)
    }

    const def = ctx.dashboardWidgetRegistry.get(existing.type)
    if (def && !def.supportedSizes.includes(size as (typeof def.supportedSizes)[number])) {
      return c.json({ error: `Size "${size}" is not supported by this widget.` }, 400)
    }

    await db
      .update(dashboardWidgets)
      .set({ size, updatedAt: new Date() })
      .where(eq(dashboardWidgets.id, existing.id))

    const [updated] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, existing.id))
    return c.json(updated)
  }
}

function handleReorderDashboardWidgets(ctx: AdminDashboardWidgetContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const ids = (body as Record<string, unknown> | null)?.ids
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string')) {
      return c.json({ error: 'Field "ids" must be an array of strings.' }, 400)
    }

    const db = ctx.getDatabase()
    const siteId = ctx.resolveRequestContext(c).site.id

    const owned = await db
      .select({ id: dashboardWidgets.id })
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.siteId, siteId), inArray(dashboardWidgets.id, ids as string[])))
    const ownedIds = new Set(owned.map((r) => r.id))

    const now = new Date()
    let position = 0
    for (const id of ids as string[]) {
      if (!ownedIds.has(id)) continue
      await db
        .update(dashboardWidgets)
        .set({ position, updatedAt: now })
        .where(and(eq(dashboardWidgets.id, id), eq(dashboardWidgets.siteId, siteId)))
      position += 1
    }

    return c.json({ message: 'Dashboard widgets reordered.' })
  }
}

function handleDeleteDashboardWidget(ctx: AdminDashboardWidgetContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const siteId = ctx.resolveRequestContext(c).site.id
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'Dashboard widget id is required.' }, 400)

    const [existing] = await db
      .select()
      .from(dashboardWidgets)
      .where(and(eq(dashboardWidgets.id, id), eq(dashboardWidgets.siteId, siteId)))

    if (!existing) return c.json({ error: 'Dashboard widget not found.' }, 404)

    await db.delete(dashboardWidgets).where(eq(dashboardWidgets.id, existing.id))
    return c.json({ message: 'Dashboard widget removed.' })
  }
}

export function registerDashboardWidgetRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminDashboardWidgetContext,
): void {
  registerRoute('GET', '/dashboard-widget-types', 'site.content.read', handleListDashboardWidgetTypes(context))
  registerRoute('GET', '/dashboard-widgets', 'site.content.read', handleListDashboardWidgets(context))
  registerRoute('POST', '/dashboard-widgets', 'site.widgets.manage', handleCreateDashboardWidget(context))
  registerRoute('PUT', '/dashboard-widgets/reorder', 'site.widgets.manage', handleReorderDashboardWidgets(context))
  registerRoute('PUT', '/dashboard-widgets/:id', 'site.widgets.manage', handleUpdateDashboardWidget(context))
  registerRoute('DELETE', '/dashboard-widgets/:id', 'site.widgets.manage', handleDeleteDashboardWidget(context))
}
