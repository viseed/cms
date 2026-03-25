import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { Eta } from 'eta'
import type { CMSTheme, LayoutContext, ThemeAssets } from '@hana/types'
import type { HanaCMS } from './hana-cms'

export interface ThemeRuntime {
  theme: CMSTheme
  eta: Eta
  renderLayout(layoutKey: string, context: Omit<LayoutContext, 'data'> & { data: Record<string, unknown> }): Promise<string>
  buildAssetTags(): { css: string[]; js: string[]; fonts: string[] }
}

export function createThemeRuntime(
  theme: CMSTheme,
  cms: HanaCMS,
): ThemeRuntime {
  const templateDir = resolveTemplateDir(theme)
  const eta = new Eta({ views: templateDir, cache: true })

  return {
    theme,
    eta,

    async renderLayout(layoutKey, context) {
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

      const html = eta.render(layout.template, {
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

function resolveTemplateDir(theme: CMSTheme): string {
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
