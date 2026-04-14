import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DatabaseInstance } from '@hana/core'
import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@hana/types'
import { asc, eq } from 'drizzle-orm'
import { setupMenuRoutes } from './routes'
import { menuItems, menuSchema, menus } from './schema'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface MenuItemNode {
  id: string
  label: string
  url: string
  target: string
  children: MenuItemNode[]
}

function buildMenuTree(flatItems: typeof menuItems.$inferSelect[]): MenuItemNode[] {
  const roots: MenuItemNode[] = []
  const byId = new Map<string, MenuItemNode>()

  for (const item of flatItems) {
    byId.set(item.id, {
      id: item.id,
      label: item.label,
      url: item.url,
      target: item.target ?? '_self',
      children: [],
    })
  }

  for (const item of flatItems) {
    const node = byId.get(item.id)!
    if (item.parentId && byId.has(item.parentId)) {
      byId.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

let db: DatabaseInstance | null = null

export function menuPlugin(): CMSPlugin {
  return {
    name: 'menu',
    version: '0.1.0',
    schema: menuSchema,
    admin: {
      menuItems: [
        {
          id: 'menus',
          label: 'Menus',
          icon: '☰',
          path: '/menus',
          siteScoped: true,
          requiredPermissions: ['site.menu.read'],
          order: 15,
          componentExport: 'MenusView',
        },
      ],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
    hooks: {
      [HOOK_KEY.CMS_INIT]: (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
      [HOOK_KEY.THEME_BEFORE_RENDER]: async (
        _layoutKey: string,
        data: Record<string, unknown>,
        reqCtx: ThemeRenderRequestContext,
      ) => {
        if (!db) return data

        const siteId = 'default'

        const allMenus = await db
          .select()
          .from(menus)
          .where(eq(menus.siteId, siteId))

        const menuData: Record<string, MenuItemNode[]> = {}

        for (const menu of allMenus) {
          const items = await db
            .select()
            .from(menuItems)
            .where(eq(menuItems.menuId, menu.id))
            .orderBy(asc(menuItems.sortOrder))

          menuData[menu.zone] = buildMenuTree(items)
        }

        return {
          ...data,
          menuMain: menuData['main'] ?? [],
          menuFooter: menuData['footer'] ?? [],
          menuData,
        }
      },
    },
    routes: (app, helpers) => setupMenuRoutes(app, helpers, () => db),
  }
}

export { menuSchema, menus, menuItems } from './schema'
