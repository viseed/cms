import { describe, expect, test } from 'bun:test'
import { createUserSchema, loginSchema, updateUserSchema } from './user'

describe('createUserSchema', () => {
  test('accepts a valid payload and defaults role to site_content_writer', () => {
    const result = createUserSchema.parse({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane',
    })
    expect(result.role).toBe('site_content_writer')
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

  test('rejects an unknown role', () => {
    const result = createUserSchema.safeParse({
      email: 'jane@example.com',
      password: 'super-secret',
      name: 'Jane',
      role: 'superuser',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateUserSchema', () => {
  test('omits password so it cannot be updated here', () => {
    const result = updateUserSchema.parse({ name: 'New Name', password: 'should-be-ignored' })
    expect('password' in result).toBe(false)
  })

  test('allows an empty payload', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true)
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
