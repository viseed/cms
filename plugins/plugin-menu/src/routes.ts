import type { DatabaseInstance } from '@viseed/core'
import type { CMSRouteContextHelpers } from '@viseed/types'
import { PERMISSIONS } from '@viseed/types'
import { asc, eq } from 'drizzle-orm'
import type { Context, Hono } from 'hono'
import { menuItems, menus } from './schema'

export function setupMenuRoutes(
  _app: Hono,
  helpers: CMSRouteContextHelpers,
  getDb: () => DatabaseInstance | null,
): void {
  const router = helpers.createSubApp('/api/menus')

  router.get('/', PERMISSIONS.siteMenuRead, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const { site } = helpers.resolveRequestContext(c)
    const rows = await db.select().from(menus).where(eq(menus.siteId, site.id))
    return c.json({ menus: rows })
  })

  router.post('/', PERMISSIONS.siteMenuWrite, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const body = await c.req.json()
    if (!body.name || !body.zone) {
      return c.json({ error: 'name and zone are required' }, 400)
    }

    const { site } = helpers.resolveRequestContext(c)
    const id = crypto.randomUUID()

    await db.insert(menus).values({
      id,
      siteId: site.id,
      name: body.name,
      zone: body.zone,
      createdAt: new Date(),
    })

    const [created] = await db.select().from(menus).where(eq(menus.id, id))
    return c.json({ menu: created }, 201)
  })

  router.put('/:id', PERMISSIONS.siteMenuWrite, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    if (!id) return c.json({ error: 'id is required' }, 400)
    const body = await c.req.json()

    const [existing] = await db.select().from(menus).where(eq(menus.id, id))
    if (!existing) return c.json({ error: 'Menu not found' }, 404)

    await db
      .update(menus)
      .set({ name: body.name ?? existing.name, zone: body.zone ?? existing.zone })
      .where(eq(menus.id, id))

    const [updated] = await db.select().from(menus).where(eq(menus.id, id))
    return c.json({ menu: updated })
  })

  router.delete('/:id', PERMISSIONS.siteMenuWrite, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    if (!id) return c.json({ error: 'id is required' }, 400)
    const [existing] = await db.select().from(menus).where(eq(menus.id, id))
    if (!existing) return c.json({ error: 'Menu not found' }, 404)

    await db.delete(menuItems).where(eq(menuItems.menuId, id))
    await db.delete(menus).where(eq(menus.id, id))
    return c.json({ message: 'Menu deleted', id })
  })

  router.get('/:id/items', PERMISSIONS.siteMenuRead, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const id = c.req.param('id')
    if (!id) return c.json({ error: 'id is required' }, 400)
    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.menuId, id))
      .orderBy(asc(menuItems.sortOrder))

    return c.json({ items })
  })

  router.put('/:id/items', PERMISSIONS.siteMenuWrite, async (c: Context) => {
    const db = getDb()
    if (!db) return c.json({ error: 'Database not ready' }, 503)

    const menuId = c.req.param('id')
    if (!menuId) return c.json({ error: 'id is required' }, 400)
    const body = await c.req.json()
    const incomingItems: Array<{
      id?: string
      parentId?: string | null
      label: string
      url: string
      target?: string
      sortOrder: number
    }> = body.items ?? []

    const existing = await db.select().from(menuItems).where(eq(menuItems.menuId, menuId))
    const existingIds = new Set(existing.map((i) => i.id))

    const normalizedIncoming = incomingItems.map((item, index) => ({
      item,
      incomingId: item.id ?? `__incoming-${index}`,
      incomingParentId: item.parentId ?? null,
    }))

    const incomingIds = new Set(
      normalizedIncoming
        .map((entry) => entry.item.id)
        .filter((id): id is string => typeof id === 'string')
        .filter((id) => existingIds.has(id)),
    )

    const idMap = new Map<string, string>()
    for (const entry of normalizedIncoming) {
      const providedId = entry.item.id
      if (providedId && existingIds.has(providedId)) {
        idMap.set(entry.incomingId, providedId)
      } else {
        idMap.set(entry.incomingId, crypto.randomUUID())
      }
    }

    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        await db.delete(menuItems).where(eq(menuItems.id, id))
      }
    }

    for (const entry of normalizedIncoming) {
      const persistedId = idMap.get(entry.incomingId)
      if (!persistedId) continue

      const resolvedParentId = entry.incomingParentId
        ? (idMap.get(entry.incomingParentId) ?? entry.incomingParentId)
        : null

      if (existingIds.has(persistedId)) {
        await db
          .update(menuItems)
          .set({
            parentId: resolvedParentId,
            label: entry.item.label,
            url: entry.item.url,
            target: entry.item.target ?? '_self',
            sortOrder: entry.item.sortOrder,
          })
          .where(eq(menuItems.id, persistedId))
      } else {
        await db.insert(menuItems).values({
          id: persistedId,
          menuId,
          parentId: resolvedParentId,
          label: entry.item.label,
          url: entry.item.url,
          target: entry.item.target ?? '_self',
          sortOrder: entry.item.sortOrder,
          createdAt: new Date(),
        })
      }
    }

    const saved = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.menuId, menuId))
      .orderBy(asc(menuItems.sortOrder))

    return c.json({ items: saved })
  })
}
