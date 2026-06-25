import { randomUUID } from 'node:crypto'
import { rolePermissions, roles, userSiteRoles, users } from '@viseed/schema'
import type { Permission, RoleSummary } from '@viseed/types'
import { PERMISSION_CATALOG } from '@viseed/types'
import { createRoleSchema, updateRoleSchema } from '@viseed/validator'
import { eq } from 'drizzle-orm'
import type { Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import type { RegisterAdminRoute } from './auth'

export interface AdminRolesContext {
  getDatabase: () => DatabaseInstance
}

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSION_CATALOG)

function validatePermissions(permissions: Array<string>): {
  ok: boolean
  invalid: Array<string>
} {
  const invalid = permissions.filter((permission) => !PERMISSION_SET.has(permission))
  return { ok: invalid.length === 0, invalid }
}

async function setRolePermissions(
  db: DatabaseInstance,
  slug: string,
  permissions: Array<string>,
): Promise<void> {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleSlug, slug))
  const unique = [...new Set(permissions)]
  for (const permission of unique) {
    await db.insert(rolePermissions).values({
      id: randomUUID(),
      roleSlug: slug,
      permission,
    })
  }
}

function handleListPermissions(): Handler {
  return (c) => c.json({ permissions: PERMISSION_CATALOG })
}

function handleListRoles(ctx: AdminRolesContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const roleRows = await db
      .select({
        slug: roles.slug,
        name: roles.name,
        description: roles.description,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .orderBy(roles.createdAt)

    const permissionRows = await db
      .select({ roleSlug: rolePermissions.roleSlug, permission: rolePermissions.permission })
      .from(rolePermissions)

    const permissionsByRole = new Map<string, Array<Permission>>()
    for (const row of permissionRows) {
      if (!PERMISSION_SET.has(row.permission)) continue
      const list = permissionsByRole.get(row.roleSlug) ?? []
      list.push(row.permission as Permission)
      permissionsByRole.set(row.roleSlug, list)
    }

    const summaries: Array<RoleSummary> = roleRows.map((role) => ({
      slug: role.slug,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: permissionsByRole.get(role.slug) ?? [],
    }))

    return c.json({ roles: summaries })
  }
}

function handleCreateRole(ctx: AdminRolesContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = createRoleSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid role payload.', details: parsed.error.flatten() }, 400)
    }

    const { ok, invalid } = validatePermissions(parsed.data.permissions)
    if (!ok) {
      return c.json({ error: `Unknown permission(s): ${invalid.join(', ')}.` }, 400)
    }

    const db = ctx.getDatabase()
    const [existing] = await db
      .select({ slug: roles.slug })
      .from(roles)
      .where(eq(roles.slug, parsed.data.slug))
    if (existing) {
      return c.json({ error: 'A role with this slug already exists.' }, 409)
    }

    await db.insert(roles).values({
      id: randomUUID(),
      slug: parsed.data.slug,
      name: parsed.data.name.trim(),
      description: parsed.data.description ?? null,
      isSystem: false,
    })
    await setRolePermissions(db, parsed.data.slug, parsed.data.permissions)

    return c.json({ slug: parsed.data.slug }, 201)
  }
}

function handleUpdateRole(ctx: AdminRolesContext): Handler {
  return async (c) => {
    const slug = c.req.param('slug') ?? ''
    if (!slug) return c.json({ error: 'Role slug is required.' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = updateRoleSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid role payload.', details: parsed.error.flatten() }, 400)
    }

    const db = ctx.getDatabase()
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug))
    if (!role) {
      return c.json({ error: 'Role not found.' }, 404)
    }

    const updates: Partial<typeof role> = { updatedAt: new Date() }
    if (parsed.data.name) {
      updates.name = parsed.data.name.trim()
    }
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description ?? null
    }
    if (Object.keys(updates).length > 1) {
      await db.update(roles).set(updates).where(eq(roles.slug, slug))
    }

    if (parsed.data.permissions) {
      // The admin role is always granted the full catalog and cannot be narrowed.
      if (slug === 'admin') {
        return c.json(
          { error: 'The admin role permissions are locked to full access.' },
          400,
        )
      }
      const { ok, invalid } = validatePermissions(parsed.data.permissions)
      if (!ok) {
        return c.json({ error: `Unknown permission(s): ${invalid.join(', ')}.` }, 400)
      }
      await setRolePermissions(db, slug, parsed.data.permissions)
    }

    return c.json({ ok: true })
  }
}

function handleDeleteRole(ctx: AdminRolesContext): Handler {
  return async (c) => {
    const slug = c.req.param('slug') ?? ''
    if (!slug) return c.json({ error: 'Role slug is required.' }, 400)

    const db = ctx.getDatabase()
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug))
    if (!role) {
      return c.json({ error: 'Role not found.' }, 404)
    }
    if (role.isSystem) {
      return c.json({ error: 'System roles cannot be deleted.' }, 403)
    }

    const [assigned] = await db
      .select({ id: userSiteRoles.id })
      .from(userSiteRoles)
      .where(eq(userSiteRoles.role, slug))
      .limit(1)
    const [globalAssigned] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, slug))
      .limit(1)
    if (assigned || globalAssigned) {
      return c.json({ error: 'This role is assigned to one or more users.' }, 409)
    }

    await db.delete(roles).where(eq(roles.slug, slug))
    return c.json({ ok: true })
  }
}

export function registerRolesRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminRolesContext,
): void {
  registerRoute('GET', '/permissions', 'platform.users.read', handleListPermissions())
  registerRoute('GET', '/roles', 'platform.users.read', handleListRoles(context))
  registerRoute('POST', '/roles', 'platform.users.manage', handleCreateRole(context))
  registerRoute('PUT', '/roles/:slug', 'platform.users.manage', handleUpdateRole(context))
  registerRoute('DELETE', '/roles/:slug', 'platform.users.manage', handleDeleteRole(context))
}
