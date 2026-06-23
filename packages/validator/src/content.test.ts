import { describe, expect, test } from 'bun:test'
import {
  contentQuerySchema,
  createContentSchema,
  metaSeoSchema,
  schemaOrgArraySchema,
  updateContentSchema,
} from './content'

describe('createContentSchema', () => {
  test('accepts a minimal valid payload and defaults status to draft', () => {
    const result = createContentSchema.parse({ title: 'Hello', slug: 'hello-world' })
    expect(result.status).toBe('draft')
  })

  test('accepts a valid hyphenated slug', () => {
    expect(createContentSchema.safeParse({ title: 'T', slug: 'my-post-1' }).success).toBe(true)
  })

  test('rejects slug with underscore', () => {
    expect(createContentSchema.safeParse({ title: 'T', slug: 'Hello_World' }).success).toBe(false)
  })

  test('rejects slug with uppercase letters', () => {
    expect(createContentSchema.safeParse({ title: 'T', slug: 'Hello' }).success).toBe(false)
  })

  test('rejects slug with diacritics', () => {
    expect(createContentSchema.safeParse({ title: 'T', slug: 'bài-viết' }).success).toBe(false)
  })

  test('rejects slug with whitespace', () => {
    expect(createContentSchema.safeParse({ title: 'T', slug: 'hello world' }).success).toBe(false)
  })

  test('rejects an empty title', () => {
    expect(createContentSchema.safeParse({ title: '', slug: 'hello' }).success).toBe(false)
  })
})

describe('updateContentSchema', () => {
  test('allows a partial payload', () => {
    expect(updateContentSchema.safeParse({ title: 'Updated' }).success).toBe(true)
    expect(updateContentSchema.safeParse({}).success).toBe(true)
  })

  test('still enforces slug format when provided', () => {
    expect(updateContentSchema.safeParse({ slug: 'Bad_Slug' }).success).toBe(false)
  })
})

describe('metaSeoSchema', () => {
  test('accepts a valid absolute ogImage url', () => {
    expect(metaSeoSchema.safeParse({ ogImage: 'https://cdn.example.com/a.png' }).success).toBe(true)
  })

  test('accepts an empty string for url fields', () => {
    expect(metaSeoSchema.safeParse({ ogImage: '', canonicalUrl: '' }).success).toBe(true)
  })

  test('rejects an invalid url', () => {
    expect(metaSeoSchema.safeParse({ canonicalUrl: 'not-a-url' }).success).toBe(false)
  })

  test('rejects a metaTitle longer than 160 characters', () => {
    expect(metaSeoSchema.safeParse({ metaTitle: 'a'.repeat(161) }).success).toBe(false)
  })
})

describe('schemaOrgArraySchema', () => {
  test('accepts nested schema.org items', () => {
    const result = schemaOrgArraySchema.safeParse([
      {
        '@type': 'Article',
        headline: 'Title',
        author: { '@type': 'Person', name: 'Jane' },
        tags: ['a', 'b'],
      },
    ])
    expect(result.success).toBe(true)
  })

  test('rejects an item without @type', () => {
    expect(schemaOrgArraySchema.safeParse([{ headline: 'No type' }]).success).toBe(false)
  })
})

describe('contentQuerySchema', () => {
  test('applies default pagination and sorting', () => {
    const result = contentQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.sortBy).toBe('createdAt')
    expect(result.sortOrder).toBe('desc')
  })

  test('rejects an unknown sortBy value', () => {
    expect(contentQuerySchema.safeParse({ sortBy: 'views' }).success).toBe(false)
  })
})
