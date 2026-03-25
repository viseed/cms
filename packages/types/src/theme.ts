import type { HanaCMS } from './cms'
import type {
  RequiredLayoutKey,
  ThemeLayoutKey,
  ThemeMenuDeclaration,
  ThemeMenuItem,
} from './theme-layout'

export type { ThemeMenuItem }

export interface ThemeSettingsValue {
  [key: string]: unknown
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

/**
 * Typed layout map: all required keys must be present.
 * Optional and custom string keys are allowed but not enforced.
 */
export type ThemeLayoutMap =
  & Record<RequiredLayoutKey, ThemeLayoutEntry>
  & Partial<Record<Exclude<ThemeLayoutKey, RequiredLayoutKey>, ThemeLayoutEntry>>
  & Record<string, ThemeLayoutEntry>

export interface CMSTheme {
  name: string
  version: string
  layouts: ThemeLayoutMap
  menuZones?: ThemeMenuDeclaration
  settingsSchema?: Record<string, unknown>
  assets?: ThemeAssets
  hooks?: Partial<CMSThemeHooks>
}

export interface CMSThemeHooks {
  'theme:beforeRender': (context: LayoutContext) => LayoutContext | Promise<LayoutContext>
  'theme:afterRender': (html: string) => string | Promise<string>
}

export type ThemeFactory = (options?: Record<string, unknown>) => CMSTheme
