import type { HanaCMS } from './cms'
import type { CMSPlugin } from './plugin'
import type { ThemeExtensionManifest } from './theme-extension-points'
import type {
  RequiredLayoutKey,
  ThemeLayoutKey,
  ThemeMenuDeclaration,
  ThemeMenuItem,
} from './theme-layout'
import type { ThemeSettingsSchema, ThemeSettingsValue } from './theme-settings'

// Re-export so consumers can import ThemeSettingsValue from '@hana/types' directly.
export type { ThemeMenuItem, ThemeSettingsSchema, ThemeSettingsValue }

export interface LayoutContext<TData = Record<string, unknown>> {
  data: TData
  settings: ThemeSettingsValue
  menus: Record<string, ThemeMenuItem[]>
  request: { url: string; params: Record<string, string> }
}

export interface ThemeLayoutEntry<TData = Record<string, unknown>> {
  template: string
  routePattern?: string
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
export type ThemeLayoutMap = Record<RequiredLayoutKey, ThemeLayoutEntry> &
  Partial<Record<Exclude<ThemeLayoutKey, RequiredLayoutKey>, ThemeLayoutEntry>> &
  Record<string, ThemeLayoutEntry>

export interface CMSTheme {
  name: string
  version: string
  /** Absolute path to the directory containing .eta template files. Falls back to cwd-based resolution if not set. */
  templateRoot?: string
  /** Absolute path to the directory containing static assets (css, js, images). */
  staticRoot?: string
  layouts: ThemeLayoutMap
  menuZones?: ThemeMenuDeclaration
  /**
   * Optional manifest of extension slots this theme renders.
   * Plugins target these ids; the theme decides physical placement in templates.
   */
  extensionPoints?: ThemeExtensionManifest
  /** Structured schema describing all configurable settings for this theme. */
  settingsSchema?: ThemeSettingsSchema
  assets?: ThemeAssets
  hooks?: Partial<CMSThemeHooks>
  companionPlugin?: CMSPlugin
}

export interface CMSThemeHooks {
  'theme:beforeRender': (context: LayoutContext) => LayoutContext | Promise<LayoutContext>
  'theme:afterRender': (html: string) => string | Promise<string>
}

export type ThemeFactory = (options?: Record<string, unknown>) => CMSTheme
