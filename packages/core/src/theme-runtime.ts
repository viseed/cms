import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CMSTheme, LayoutContext, ThemeAssets } from '@hana/types'
import nunjucks from 'nunjucks'
import type { HanaCMS } from './hana-cms'

export interface ThemeRenderOptions {
  /** Absolute directory that contains `.njk` templates (see `resolveTemplateDirFromAbsoluteRoot`). */
  templateRoot?: string
}

export interface ThemeRuntime {
  theme: CMSTheme
  env: nunjucks.Environment
  renderLayout(
    layoutKey: string,
    context: Omit<LayoutContext, 'data'> & { data: Record<string, unknown> },
    options?: ThemeRenderOptions,
  ): Promise<string>
  buildAssetTags(): { css: string[]; js: string[]; fonts: string[] }
}

function createNunjucksEnv(templateDir: string, isDev: boolean): nunjucks.Environment {
  const loader = new nunjucks.FileSystemLoader(templateDir)
  const env = new nunjucks.Environment(loader, { autoescape: true, noCache: isDev })

  env.addFilter('dateFormat', (date: unknown, locale = 'en-US') => {
    if (!date) return ''
    try {
      return new Date(date as string).toLocaleDateString(locale)
    } catch {
      return ''
    }
  })

  env.addFilter('dateFormatLong', (date: unknown, locale = 'vi-VN') => {
    if (!date) return ''
    try {
      return new Date(date as string).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return ''
    }
  })

  env.addFilter('stripSpaces', (str: unknown) => {
    return typeof str === 'string' ? str.replace(/\s/g, '') : ''
  })

  env.addFilter('take', (arr: unknown, n: number) => {
    if (!Array.isArray(arr)) return []
    return arr.slice(0, n)
  })

  env.addFilter('excludeById', (arr: unknown, id: unknown) => {
    if (!Array.isArray(arr)) return []
    return arr.filter((item: Record<string, unknown>) => item.id !== id)
  })

  env.addGlobal('currentYear', new Date().getFullYear())

  return env
}

export function createThemeRuntime(theme: CMSTheme, cms: HanaCMS): ThemeRuntime {
  const defaultTemplateDir = resolveTemplateDir(theme)
  const isDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test'
  const defaultEnv = createNunjucksEnv(defaultTemplateDir, isDevelopment)
  const envByRoot = new Map<string, nunjucks.Environment>()

  function envForRoot(root: string): nunjucks.Environment {
    let instance = envByRoot.get(root)
    if (!instance) {
      instance = createNunjucksEnv(root, isDevelopment)
      envByRoot.set(root, instance)
    }
    return instance
  }

  return {
    theme,
    env: defaultEnv,

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
      const env = options?.templateRoot ? envForRoot(templateRoot) : defaultEnv

      const html = env.render(layout.template, {
        ...finalContext,
        assets: buildAssetTags(theme.assets),
      })

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
