import { describe, expect, test } from 'bun:test'
import { createCategorySchema, updateCategorySchema } from './category'

describe('createCategorySchema', () => {
  test('accepts a valid category', () => {
    const result = createCategorySchema.safeParse({
      name: 'Technology',
      slug: 'technology',
      description: 'Tech posts',
    })
    expect(result.success).toBe(true)
  })

  test('rejects an empty name', () => {
    expect(createCategorySchema.safeParse({ name: '', slug: 'tech' }).success).toBe(false)
  })

  test('rejects a name longer than 100 characters', () => {
    expect(createCategorySchema.safeParse({ name: 'a'.repeat(101), slug: 'tech' }).success).toBe(
      false,
    )
  })

  test('rejects an invalid slug', () => {
    expect(createCategorySchema.safeParse({ name: 'Tech', slug: 'Tech Slug' }).success).toBe(false)
  })

  test('rejects a description longer than 500 characters', () => {
    expect(
      createCategorySchema.safeParse({ name: 'Tech', slug: 'tech', description: 'a'.repeat(501) })
        .success,
    ).toBe(false)
  })
})

describe('updateCategorySchema', () => {
  test('allows a partial payload', () => {
    expect(updateCategorySchema.safeParse({ name: 'Renamed' }).success).toBe(true)
    expect(updateCategorySchema.safeParse({}).success).toBe(true)
  })

  test('still enforces slug format when provided', () => {
    expect(updateCategorySchema.safeParse({ slug: 'Bad Slug' }).success).toBe(false)
  })
})
