import { randomUUID } from 'node:crypto'
import { roles, sites, userSiteRoles, users } from '@viseed/schema'
import type { RequestContext, UserSummary } from '@viseed/types'
import { createUserSchema, resetPasswordSchema, updateUserSchema } from '@viseed/validator'
import { eq, inArray } from 'drizzle-orm'
import type { Context, Handler } from 'hono'
import type { DatabaseInstance } from '../database'
import type { RegisterAdminRoute } from './auth'

export interface AdminUsersContext {
  getDatabase: () => DatabaseInstance
  resolveRequestContext: (c: Context) => RequestContext
}

async function assertRoleSlugsExist(
  db: DatabaseInstance,
  slugs: Array<string>,
): Promise<string | null> {
  const unique = [...new Set(slugs)]
  if (unique.length === 0) {
    return null
  }
  const rows = await db.select({ slug: roles.slug }).from(roles).where(inArray(roles.slug, unique))
  const known = new Set(rows.map((row) => row.slug))
  const missing = unique.filter((slug) => !known.has(slug))
  return missing.length > 0 ? `Unknown role(s): ${missing.join(', ')}.` : null
}

async function assertSitesExist(
  db: DatabaseInstance,
  siteIds: Array<string>,
): Promise<string | null> {
  const unique = [...new Set(siteIds)]
  if (unique.length === 0) {
    return null
  }
  const rows = await db.select({ id: sites.id }).from(sites).where(inArray(sites.id, unique))
  const known = new Set(rows.map((row) => row.id))
  const missing = unique.filter((id) => !known.has(id))
  return missing.length > 0 ? `Unknown site(s): ${missing.join(', ')}.` : null
}

function toUserSummary(
  user: { id: string; email: string; name: string; role: string; isOwner: boolean },
  assignmentRows: Array<{ siteId: string; role: string }>,
): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isOwner: user.isOwner,
    globalRole: user.role || null,
    assignments: assignmentRows.map((row) => ({ siteId: row.siteId, role: row.role })),
  }
}

function handleListUsers(ctx: AdminUsersContext): Handler {
  return async (c) => {
    const db = ctx.getDatabase()
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isOwner: users.isOwner,
      })
      .from(users)
      .orderBy(users.createdAt)

    const assignmentRows = await db
      .select({ userId: userSiteRoles.userId, siteId: userSiteRoles.siteId, role: userSiteRoles.role })
      .from(userSiteRoles)

    const assignmentsByUser = new Map<string, Array<{ siteId: string; role: string }>>()
    for (const row of assignmentRows) {
      const list = assignmentsByUser.get(row.userId) ?? []
      list.push({ siteId: row.siteId, role: row.role })
      assignmentsByUser.set(row.userId, list)
    }

    const summaries = userRows.map((user) =>
      toUserSummary(user, assignmentsByUser.get(user.id) ?? []),
    )
    return c.json({ users: summaries })
  }
}

async function replaceAssignments(
  db: DatabaseInstance,
  userId: string,
  assignments: Array<{ siteId: string; roleSlug: string }>,
): Promise<void> {
  await db.delete(userSiteRoles).where(eq(userSiteRoles.userId, userId))
  for (const assignment of assignments) {
    await db.insert(userSiteRoles).values({
      id: randomUUID(),
      userId,
      siteId: assignment.siteId,
      role: assignment.roleSlug,
    })
  }
}

/** Derive the global `users.role` from assignments: admin if any admin role, else first slug. */
function deriveGlobalRole(assignments: Array<{ roleSlug: string }>): string {
  if (assignments.some((assignment) => assignment.roleSlug === 'admin')) {
    return 'admin'
  }
  return assignments[0]?.roleSlug ?? 'site_content_writer'
}

function handleCreateUser(ctx: AdminUsersContext): Handler {
  return async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user payload.', details: parsed.error.flatten() }, 400)
    }

    const db = ctx.getDatabase()
    const email = parsed.data.email.trim().toLowerCase()

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
    if (existing) {
      return c.json({ error: 'A user with this email already exists.' }, 409)
    }

    const roleError = await assertRoleSlugsExist(
      db,
      parsed.data.assignments.map((assignment) => assignment.roleSlug),
    )
    if (roleError) {
      return c.json({ error: roleError }, 400)
    }
    const siteError = await assertSitesExist(
      db,
      parsed.data.assignments.map((assignment) => assignment.siteId),
    )
    if (siteError) {
      return c.json({ error: siteError }, 400)
    }

    const passwordHash = await Bun.password.hash(parsed.data.password)
    const userId = randomUUID()

    await db.insert(users).values({
      id: userId,
      email,
      name: parsed.data.name.trim(),
      passwordHash,
      role: deriveGlobalRole(parsed.data.assignments),
      isOwner: false,
    })
    await replaceAssignments(db, userId, parsed.data.assignments)

    return c.json({ id: userId }, 201)
  }
}

function handleUpdateUser(ctx: AdminUsersContext): Handler {
  return async (c) => {
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'User id is required.' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid user payload.', details: parsed.error.flatten() }, 400)
    }

    const db = ctx.getDatabase()
    const [target] = await db.select().from(users).where(eq(users.id, id))
    if (!target) {
      return c.json({ error: 'User not found.' }, 404)
    }

    const actor = ctx.resolveRequestContext(c).actor
    // The owner record can only be modified by the owner themselves.
    if (target.isOwner && actor?.id !== target.id) {
      return c.json({ error: 'The owner account cannot be modified by another user.' }, 403)
    }

    const updates: Partial<typeof target> = { updatedAt: new Date() }
    if (parsed.data.email) {
      const email = parsed.data.email.trim().toLowerCase()
      const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (conflict && conflict.id !== id) {
        return c.json({ error: 'A user with this email already exists.' }, 409)
      }
      updates.email = email
    }
    if (parsed.data.name) {
      updates.name = parsed.data.name.trim()
    }

    if (parsed.data.assignments) {
      const roleError = await assertRoleSlugsExist(
        db,
        parsed.data.assignments.map((assignment) => assignment.roleSlug),
      )
      if (roleError) {
        return c.json({ error: roleError }, 400)
      }
      const siteError = await assertSitesExist(
        db,
        parsed.data.assignments.map((assignment) => assignment.siteId),
      )
      if (siteError) {
        return c.json({ error: siteError }, 400)
      }
      // Never downgrade the owner's effective access through assignment edits.
      if (!target.isOwner) {
        updates.role = deriveGlobalRole(parsed.data.assignments)
      }
      await replaceAssignments(db, id, parsed.data.assignments)
    }

    await db.update(users).set(updates).where(eq(users.id, id))
    return c.json({ ok: true })
  }
}

function handleResetPassword(ctx: AdminUsersContext): Handler {
  return async (c) => {
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'User id is required.' }, 400)

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: 'Invalid JSON body.' }, 400)
    }

    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: 'Invalid password payload.', details: parsed.error.flatten() }, 400)
    }

    const db = ctx.getDatabase()
    const [target] = await db.select().from(users).where(eq(users.id, id))
    if (!target) {
      return c.json({ error: 'User not found.' }, 404)
    }

    const actor = ctx.resolveRequestContext(c).actor
    if (target.isOwner && actor?.id !== target.id) {
      return c.json({ error: "The owner's password cannot be reset by another user." }, 403)
    }

    const passwordHash = await Bun.password.hash(parsed.data.password)
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id))
    return c.json({ ok: true })
  }
}

function handleDeleteUser(ctx: AdminUsersContext): Handler {
  return async (c) => {
    const id = c.req.param('id') ?? ''
    if (!id) return c.json({ error: 'User id is required.' }, 400)

    const db = ctx.getDatabase()
    const [target] = await db.select().from(users).where(eq(users.id, id))
    if (!target) {
      return c.json({ error: 'User not found.' }, 404)
    }

    if (target.isOwner) {
      return c.json({ error: 'The owner account cannot be deleted. Transfer ownership first.' }, 403)
    }

    const actor = ctx.resolveRequestContext(c).actor
    if (actor?.id === id) {
      return c.json({ error: 'You cannot delete your own account.' }, 403)
    }

    await db.delete(users).where(eq(users.id, id))
    return c.json({ ok: true })
  }
}

function handleTransferOwnership(ctx: AdminUsersContext): Handler {
  return async (c) => {
    const targetId = c.req.param('id') ?? ''
    if (!targetId) return c.json({ error: 'User id is required.' }, 400)

    const actor = ctx.resolveRequestContext(c).actor
    // Only the current owner may transfer ownership.
    if (!actor?.isOwner) {
      return c.json({ error: 'Only the current owner can transfer ownership.' }, 403)
    }
    if (actor.id === targetId) {
      return c.json({ error: 'You already own the platform.' }, 400)
    }

    const db = ctx.getDatabase()
    const [target] = await db.select().from(users).where(eq(users.id, targetId))
    if (!target) {
      return c.json({ error: 'Target user not found.' }, 404)
    }

    await db.transaction(async (tx) => {
      // Clear the current owner first to satisfy the single-owner unique index.
      await tx.update(users).set({ isOwner: false, updatedAt: new Date() }).where(eq(users.isOwner, true))
      await tx
        .update(users)
        .set({ isOwner: true, role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, targetId))

      const [existingAdminAssignment] = await tx
        .select({ id: userSiteRoles.id })
        .from(userSiteRoles)
        .where(eq(userSiteRoles.userId, targetId))
      if (!existingAdminAssignment) {
        const [defaultSite] = await tx.select({ id: sites.id }).from(sites).limit(1)
        if (defaultSite) {
          await tx.insert(userSiteRoles).values({
            id: randomUUID(),
            userId: targetId,
            siteId: defaultSite.id,
            role: 'admin',
          })
        }
      }
    })

    return c.json({ ok: true })
  }
}

export function registerUsersRoutes(
  registerRoute: RegisterAdminRoute,
  context: AdminUsersContext,
): void {
  registerRoute('GET', '/users', 'platform.users.read', handleListUsers(context))
  registerRoute('POST', '/users', 'platform.users.manage', handleCreateUser(context))
  registerRoute('PUT', '/users/:id', 'platform.users.manage', handleUpdateUser(context))
  registerRoute(
    'PUT',
    '/users/:id/password',
    'platform.users.manage',
    handleResetPassword(context),
  )
  registerRoute('DELETE', '/users/:id', 'platform.users.manage', handleDeleteUser(context))
  registerRoute(
    'POST',
    '/users/:id/transfer-ownership',
    'platform.users.manage',
    handleTransferOwnership(context),
  )
}
