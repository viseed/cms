import type { HanaCMS } from './cms'

export interface ThemeSettingsValue {
  [key: string]: unknown
}

export interface ThemeMenuItem {
  label: string
  url: string
  children?: ThemeMenuItem[]
}

export interface LayoutContext<TData = Record<string, unknown>> {
  data: TData
  settings: ThemeSettingsValue
  menus: Record<string, ThemeMenuItem[]>
  request: { url: string; params: Record<string, string> }
}

export interface ThemeLayoutEntry<TData = Record<string, unknown>> {
  template: string
  data?: (defaultData: TData, cms: HanaCMS) => TData | Promise<TData>
}

export interface ThemeAssets {
  css?: string[]
  js?: string[]
  fonts?: string[]
  staticDir?: string
}

export interface CMSTheme {
  name: string
  version: string
  layouts: Record<string, ThemeLayoutEntry>
  settingsSchema?: Record<string, unknown>
  assets?: ThemeAssets
  hooks?: Partial<CMSThemeHooks>
}

export interface CMSThemeHooks {
  'theme:beforeRender': (context: LayoutContext) => LayoutContext | Promise<LayoutContext>
  'theme:afterRender': (html: string) => string | Promise<string>
}

export type ThemeFactory = (options?: Record<string, unknown>) => CMSTheme
