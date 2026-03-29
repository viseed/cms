import { describe, expect, test } from 'bun:test'
import {
  buildPreviewPathFromParts,
  normalizeThemePreviewRelativePath,
  resolveValidatedPreviewRoot,
} from './theme-preview-path'

describe('normalizeThemePreviewRelativePath', () => {
  test('accepts themes/name/sub', () => {
    expect(normalizeThemePreviewRelativePath('themes/dark/preview')).toBe('themes/dark/preview')
  })

  test('rejects traversal', () => {
    expect(normalizeThemePreviewRelativePath('themes/../etc/passwd')).toBeNull()
  })

  test('rejects short path', () => {
    expect(normalizeThemePreviewRelativePath('themes/dark')).toBeNull()
  })

  test('rejects wrong root', () => {
    expect(normalizeThemePreviewRelativePath('foo/bar/baz')).toBeNull()
  })
})

describe('buildPreviewPathFromParts', () => {
  test('builds path', () => {
    expect(buildPreviewPathFromParts('dark', 'preview')).toBe('themes/dark/preview')
  })

  test('rejects unsafe segment', () => {
    expect(buildPreviewPathFromParts('..', 'preview')).toBeNull()
  })
})

describe('resolveValidatedPreviewRoot', () => {
  test('resolves under themes', () => {
    const abs = resolveValidatedPreviewRoot(process.cwd(), 'themes/dark/preview')
    expect(abs).not.toBeNull()
  })
})
