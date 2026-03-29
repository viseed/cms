import { isAbsolute, relative, resolve } from 'node:path'

export const THEMES_DIR_SEGMENT = 'themes'

function isSafePathSegment(segment: string): boolean {
  if (segment === '.' || segment === '..') return false
  return segment.length > 0 && segment.length <= 128 && /^[a-zA-Z0-9._-]+$/.test(segment)
}

/**
 * Build `themes/{name}/{subdir}` from safe segments only.
 */
export function buildPreviewPathFromParts(name: string, subdir: string): string | null {
  if (!isSafePathSegment(name) || !isSafePathSegment(subdir)) return null
  return `${THEMES_DIR_SEGMENT}/${name}/${subdir}`
}

/**
 * Normalize user-provided relative path. Requires at least `themes/<name>/<subdir>`.
 * Returns POSIX-style segments joined with `/`, or null if invalid / traversal.
 */
export function normalizeThemePreviewRelativePath(input: string): string | null {
  const trimmed = input.trim().replace(/\\/g, '/')
  const parts = trimmed.split('/').filter((p) => p.length > 0)
  if (parts.some((p) => p === '..' || p === '.')) return null
  if (parts.some((p) => !isSafePathSegment(p))) return null
  if (parts[0] !== THEMES_DIR_SEGMENT) return null
  if (parts.length < 3) return null
  return parts.join('/')
}

/**
 * Resolve a validated relative preview path under `cwd/themes/…`. Returns absolute path or null.
 */
export function resolveValidatedPreviewRoot(cwd: string, relativePath: string): string | null {
  if (!normalizeThemePreviewRelativePath(relativePath)) return null
  const themesRoot = resolve(cwd, THEMES_DIR_SEGMENT)
  const candidate = resolve(cwd, relativePath)
  const rel = relative(themesRoot, candidate)
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  return candidate
}
