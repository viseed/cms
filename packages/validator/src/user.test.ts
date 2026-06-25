import { describe, expect, test } from 'bun:test'
import {
  createRoleSchema,
  createUserSchema,
  loginSchema,
  resetPasswordSchema,
  roleAssignmentSchema,
  transferOwnershipSchema,
  updateRoleSchema,
  updateUserSchema,
} from './user'

describe('createUserSchema', () => {
  test('accepts a valid payload with assignments', () => {
    const result = createUserSchema.parse({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane',
      assignments: [{ siteId: 'default', roleSlug: 'site_admin' }],
    })
    expect(result.assignments).toHaveLength(1)
  })

  test('defaults assignments to an empty array', () => {
    const result = createUserSchema.parse({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane',
    })
    expect(result.assignments).toEqual([])
  })

  test('rejects an invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'not-an-email',
      password: 'super-secret',
      name: 'Jane',
    })
    expect(result.success).toBe(false)
  })

  test('rejects a password shorter than 8 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'jane@example.com',
      password: 'short',
      name: 'Jane',
    })
    expect(result.success).toBe(false)
  })

  test('rejects a password longer than 128 characters', () => {
    const result = createUserSchema.safeParse({
      email: 'jane@example.com',
      password: 'a'.repeat(129),
      name: 'Jane',
    })
    expect(result.success).toBe(false)
  })

  test('rejects an assignment with an invalid role slug', () => {
    const result = createUserSchema.safeParse({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane',
      assignments: [{ siteId: 'default', roleSlug: 'Has Spaces' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('roleAssignmentSchema', () => {
  test('requires a non-empty siteId', () => {
    expect(roleAssignmentSchema.safeParse({ siteId: '', roleSlug: 'admin' }).success).toBe(false)
  })

  test('accepts a custom lowercase slug', () => {
    expect(roleAssignmentSchema.safeParse({ siteId: 'default', roleSlug: 'editor-2' }).success).toBe(
      true,
    )
  })
})

describe('updateUserSchema', () => {
  test('does not accept a password field', () => {
    const result = updateUserSchema.parse({ name: 'New Name', password: 'should-be-ignored' })
    expect('password' in result).toBe(false)
  })

  test('allows an empty payload', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true)
  })
})

describe('resetPasswordSchema', () => {
  test('rejects a short password', () => {
    expect(resetPasswordSchema.safeParse({ password: 'short' }).success).toBe(false)
  })

  test('accepts a valid password', () => {
    expect(resetPasswordSchema.safeParse({ password: 'super-secret' }).success).toBe(true)
  })
})

describe('createRoleSchema', () => {
  test('accepts a valid custom role', () => {
    const result = createRoleSchema.parse({
      slug: 'editor',
      name: 'Editor',
      permissions: ['site.content.read', 'site.content.write'],
    })
    expect(result.permissions).toHaveLength(2)
  })

  test('defaults permissions to an empty array', () => {
    const result = createRoleSchema.parse({ slug: 'viewer', name: 'Viewer' })
    expect(result.permissions).toEqual([])
  })

  test('rejects a slug with uppercase or spaces', () => {
    expect(createRoleSchema.safeParse({ slug: 'My Role', name: 'X' }).success).toBe(false)
  })

  test('rejects an empty name', () => {
    expect(createRoleSchema.safeParse({ slug: 'role', name: '' }).success).toBe(false)
  })
})

describe('updateRoleSchema', () => {
  test('allows updating only permissions', () => {
    const result = updateRoleSchema.safeParse({ permissions: ['site.content.read'] })
    expect(result.success).toBe(true)
  })

  test('does not accept a slug field', () => {
    const result = updateRoleSchema.parse({ slug: 'new-slug', name: 'Renamed' })
    expect('slug' in result).toBe(false)
  })
})

describe('transferOwnershipSchema', () => {
  test('requires a target user id', () => {
    expect(transferOwnershipSchema.safeParse({ targetUserId: '' }).success).toBe(false)
    expect(transferOwnershipSchema.safeParse({ targetUserId: 'user-1' }).success).toBe(true)
  })
})

describe('loginSchema', () => {
  test('accepts any non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'jane@example.com', password: 'x' }).success).toBe(true)
  })

  test('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'jane@example.com', password: '' }).success).toBe(false)
  })

  test('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false)
  })
})
