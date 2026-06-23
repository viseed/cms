import { describe, expect, test } from 'bun:test'
import { installPluginSchema, pluginManifestSchema } from './plugin'

const validManifest = {
  name: 'plugin-blog',
  version: '1.0.0',
  description: 'Blog plugin',
  author: 'Viseed',
  bundleUrl: 'https://cdn.example.com/plugin-blog.js',
  integrity: 'sha256-abc',
}

describe('pluginManifestSchema', () => {
  test('accepts a valid manifest', () => {
    expect(pluginManifestSchema.safeParse(validManifest).success).toBe(true)
  })

  test('accepts optional array fields', () => {
    const result = pluginManifestSchema.safeParse({
      ...validManifest,
      schemaSql: ['CREATE TABLE x'],
      tags: ['blog', 'content'],
      homepage: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  test('rejects an invalid semver version', () => {
    expect(pluginManifestSchema.safeParse({ ...validManifest, version: '1.0' }).success).toBe(false)
  })

  test('rejects a non-url bundleUrl', () => {
    expect(
      pluginManifestSchema.safeParse({ ...validManifest, bundleUrl: 'not-a-url' }).success,
    ).toBe(false)
  })

  test('rejects an empty integrity', () => {
    expect(pluginManifestSchema.safeParse({ ...validManifest, integrity: '' }).success).toBe(false)
  })

  test('rejects a non-url homepage when provided', () => {
    expect(pluginManifestSchema.safeParse({ ...validManifest, homepage: 'nope' }).success).toBe(
      false,
    )
  })
})

describe('installPluginSchema', () => {
  test('accepts a valid install payload', () => {
    const result = installPluginSchema.safeParse({
      bundleUrl: 'https://cdn.example.com/p.js',
      integrity: 'sha256-abc',
    })
    expect(result.success).toBe(true)
  })

  test('rejects a non-url bundleUrl', () => {
    expect(
      installPluginSchema.safeParse({ bundleUrl: 'nope', integrity: 'sha256-abc' }).success,
    ).toBe(false)
  })
})
