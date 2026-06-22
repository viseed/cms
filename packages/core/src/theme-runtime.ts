import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { CMSTheme, LayoutContext, ThemeAssets } from '@viseed/types'
import { Eta } from 'eta'
import type { ViseedCMS } from './viseed-cms'
import { createLayoutHelpers } from './seo-head'

export interface ThemeRenderOptions {
  /** Absolute directory that contains `.eta` templates (see `resolveTemplateDirFromAbsoluteRoot`). */
  templateRoot?: string
  /** Preview token to append as `?viseed_preview=TOKEN` on all static asset URLs. */
  previewToken?: string
}

export interface ThemeRuntime {
  theme: CMSTheme
  eta: Eta
  renderLayout(
    layoutKey: string,
    context: Omit<LayoutContext, 'data' | 'helpers'> & { data: Record<string, unknown> },
    options?: ThemeRenderOptions,
  ): Promise<string>
  buildAssetTags(): { css: string[]; js: string[]; fonts: string[] }
}

export function createThemeRuntime(theme: CMSTheme, cms: ViseedCMS): ThemeRuntime {
  const defaultTemplateDir = resolveTemplateDir(theme)
  /** One value per theme process lifetime — not recomputed per HTTP request. */
  const assetFingerprint = resolveStaticAssetFingerprint(theme)
  const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
  const defaultEta = new Eta({ views: defaultTemplateDir, cache: !isDevelopment })
  const etaByRoot = new Map<string, Eta>()

  function etaForRoot(root: string): Eta {
    let instance = etaByRoot.get(root)
    if (!instance) {
      instance = new Eta({ views: root, cache: !isDevelopment })
      etaByRoot.set(root, instance)
    }
    return instance
  }

  return {
    theme,
    eta: defaultEta,

    async renderLayout(layoutKey, context, options?) {
      const layout = theme.layouts[layoutKey]
      if (!layout) {
        throw new Error(`Theme "${theme.name}" does not have layout "${layoutKey}"`)
      }

      let data = { ...context.data }

      if (layout.data) {
        data = await layout.data(data, cms as never)
      }

      const finalContext: LayoutContext = {
        data,
        settings: context.settings,
        menus: context.menus,
        request: context.request,
        helpers: createLayoutHelpers(context.request?.url ?? ''),
      }

      const templateRoot = options?.templateRoot ?? defaultTemplateDir
      const eta = options?.templateRoot ? etaForRoot(templateRoot) : defaultEta

      const html =
        eta.render(layout.template, {
          ...finalContext,
          assets: buildAssetTags(theme.assets, options?.previewToken, assetFingerprint),
          previewToken: options?.previewToken ?? null,
        }) ?? ''

      return html
    },

    buildAssetTags() {
      return buildAssetTags(theme.assets, undefined, assetFingerprint)
    },
  }
}

/** Resolve template directory for a theme package rooted at `absThemeRoot` (e.g. `…/themes/my-theme`). */
export function resolveTemplateDirFromAbsoluteRoot(absThemeRoot: string): string {
  const withTemplates = resolve(absThemeRoot, 'templates')
  const candidates = [withTemplates, absThemeRoot]

  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }

  return withTemplates
}

/** Static assets directory for a theme root, if it exists. */
export function resolveThemeStaticDirFromRoot(absThemeRoot: string): string | null {
  const d = resolve(absThemeRoot, 'static')
  return existsSync(d) ? d : null
}

function resolveTemplateDir(theme: CMSTheme): string {
  if (theme.templateRoot) {
    return theme.templateRoot
  }

  const fallback = resolve(process.cwd(), 'themes', theme.name, 'templates')
  const candidates = [
    fallback,
    resolve(process.cwd(), 'themes', theme.name),
    resolve(process.cwd(), 'theme', 'templates'),
  ]

  for (const dir of candidates) {
    if (existsSync(dir)) return dir
  }

  return fallback
}

/**
 * If `theme.staticAssetFingerprint` is unset, the server may read (once per process,
 * when the theme runtime is created) either `staticRoot/.viseed-static-fingerprint`
 * (first line = token from your theme build/CI) or a short hash of `assets` file bytes.
 */
export function resolveStaticAssetFingerprint(theme: CMSTheme): string {
  const explicit = theme.staticAssetFingerprint?.trim()
  if (explicit) return explicit

  const fromFile = readStaticFingerprintFile(theme)
  if (fromFile) return fromFile

  return computeThemeAssetFingerprint(theme)
}

function readStaticFingerprintFile(theme: CMSTheme): string {
  const root = theme.staticRoot
  if (!root) return ''
  const p = join(root, '.viseed-static-fingerprint')
  if (!existsSync(p)) return ''
  try {
    const line = readFileSync(p, 'utf8').split(/\r?\n/)[0]?.trim() ?? ''
    return line
  } catch {
    return ''
  }
}

/**
 * Short fingerprint of declared theme static files (css/js/fonts). Used only when
 * neither `staticAssetFingerprint` nor `.viseed-static-fingerprint` is provided.
 */
export function computeThemeAssetFingerprint(theme: CMSTheme): string {
  const root = theme.staticRoot
  const manifest = theme.assets
  if (!root || !manifest) return ''

  const rels = [...(manifest.css ?? []), ...(manifest.js ?? []), ...(manifest.fonts ?? [])].sort()
  if (rels.length === 0) return ''

  const h = createHash('sha1')
  for (const rel of rels) {
    const abs = join(root, rel)
    h.update(rel)
    if (!existsSync(abs)) {
      h.update(':missing')
      continue
    }
    h.update(readFileSync(abs))
  }
  return h.digest('hex').slice(0, 10)
}

function themeStaticQuery(previewToken?: string, assetFingerprint?: string): string {
  const parts: string[] = []
  if (previewToken) parts.push(`viseed_preview=${encodeURIComponent(previewToken)}`)
  if (assetFingerprint) parts.push(`v=${encodeURIComponent(assetFingerprint)}`)
  return parts.length > 0 ? `?${parts.join('&')}` : ''
}

function buildAssetTags(
  assets?: ThemeAssets,
  previewToken?: string,
  assetFingerprint?: string,
): { css: string[]; js: string[]; fonts: string[] } {
  if (!assets) return { css: [], js: [], fonts: [] }

  const base = '/theme/static'
  const qs = themeStaticQuery(previewToken, assetFingerprint)
  return {
    css: (assets.css ?? []).map((file) => `${base}/${file}${qs}`),
    js: (assets.js ?? []).map((file) => `${base}/${file}${qs}`),
    fonts: (assets.fonts ?? []).map((file) => `${base}/${file}${qs}`),
  }
}
