import { describe, expect, test } from 'bun:test'
import { mediaQuerySchema, uploadMediaSchema } from './media'

describe('uploadMediaSchema', () => {
  test('accepts a valid upload payload', () => {
    const result = uploadMediaSchema.safeParse({
      filename: 'photo.png',
      mimeType: 'image/png',
      size: 1024,
      alt: 'A photo',
    })
    expect(result.success).toBe(true)
  })

  test('rejects an empty filename', () => {
    const result = uploadMediaSchema.safeParse({
      filename: '',
      mimeType: 'image/png',
      size: 1024,
    })
    expect(result.success).toBe(false)
  })

  test('rejects a filename longer than 500 characters', () => {
    const result = uploadMediaSchema.safeParse({
      filename: 'a'.repeat(501),
      mimeType: 'image/png',
      size: 1024,
    })
    expect(result.success).toBe(false)
  })

  test('rejects a non-positive size', () => {
    expect(
      uploadMediaSchema.safeParse({ filename: 'a.png', mimeType: 'image/png', size: 0 }).success,
    ).toBe(false)
    expect(
      uploadMediaSchema.safeParse({ filename: 'a.png', mimeType: 'image/png', size: -1 }).success,
    ).toBe(false)
  })

  test('rejects a non-integer size', () => {
    const result = uploadMediaSchema.safeParse({
      filename: 'a.png',
      mimeType: 'image/png',
      size: 1.5,
    })
    expect(result.success).toBe(false)
  })

  test('rejects an empty mimeType', () => {
    const result = uploadMediaSchema.safeParse({
      filename: 'a.png',
      mimeType: '',
      size: 1024,
    })
    expect(result.success).toBe(false)
  })
})

describe('mediaQuerySchema', () => {
  test('applies default page and limit', () => {
    const result = mediaQuerySchema.parse({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  test('coerces numeric strings for page and limit', () => {
    const result = mediaQuerySchema.parse({ page: '3', limit: '50' })
    expect(result.page).toBe(3)
    expect(result.limit).toBe(50)
  })

  test('rejects a limit greater than 100', () => {
    const result = mediaQuerySchema.safeParse({ limit: '101' })
    expect(result.success).toBe(false)
  })

  test('rejects a non-positive page', () => {
    expect(mediaQuerySchema.safeParse({ page: '0' }).success).toBe(false)
  })
})
