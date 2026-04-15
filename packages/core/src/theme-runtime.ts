import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CMSTheme, LayoutContext, ThemeAssets } from '@hana/types'
import { Eta } from 'eta'
import type { HanaCMS } from './hana-cms'

export interface ThemeRenderOptions {
  /** Absolute directory that contains `.eta` templates (see `resolveTemplateDirFromAbsoluteRoot`). */
  templateRoot?: string
}

export interface ThemeRuntime {
  theme: CMSTheme
  eta: Eta
  renderLayout(
    layoutKey: string,
    context: Omit<LayoutContext, 'data'> & { data: Record<string, unknown> },
    options?: ThemeRenderOptions,
  ): Promise<string>
  buildAssetTags(): { css: string[]; js: string[]; fonts: string[] }
}

export function createThemeRuntime(theme: CMSTheme, cms: HanaCMS): ThemeRuntime {
  const defaultTemplateDir = resolveTemplateDir(theme)
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
      }

      const templateRoot = options?.templateRoot ?? defaultTemplateDir
      const eta = options?.templateRoot ? etaForRoot(templateRoot) : defaultEta

      const html =
        eta.render(layout.template, {
          ...finalContext,
          assets: buildAssetTags(theme.assets),
        }) ?? ''

      return html
    },

    buildAssetTags() {
      return buildAssetTags(theme.assets)
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

function buildAssetTags(assets?: ThemeAssets): { css: string[]; js: string[]; fonts: string[] } {
  if (!assets) return { css: [], js: [], fonts: [] }

  const base = '/theme/static'
  return {
    css: (assets.css ?? []).map((file) => `${base}/${file}`),
    js: (assets.js ?? []).map((file) => `${base}/${file}`),
    fonts: (assets.fonts ?? []).map((file) => `${base}/${file}`),
  }
}
