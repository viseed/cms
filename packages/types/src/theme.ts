import type { HanaCMS, HOOK_KEY } from './cms'
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

export interface LayoutHelpers {
  /**
   * Render a complete SEO `<head>` block (title, meta description, canonical,
   * Open Graph, Twitter Card, JSON-LD) from the current layout context.
   * Auto-detects context from `it.data.page` / `it.data.post` / `it.data.category`,
   * falling back to site-level settings for home / 404.
   */
  seoHead: (context: LayoutContext) => string
  /**
   * Convert a relative path to an absolute URL using the current request origin.
   * Returns the input untouched if it is already absolute (`http://`, `https://`, `//...`).
   */
  absoluteUrl: (pathOrUrl: string | null | undefined) => string
  /** Strip HTML tags and truncate plain text. Useful for meta description fallbacks. */
  excerpt: (input: string | null | undefined, maxLength?: number) => string
  /** Escape `</script>` sequences so JSON-LD payloads cannot break out of a `<script>` tag. */
  escapeJsonLd: (value: unknown) => string
}

export interface LayoutContext<TData = Record<string, unknown>> {
  data: TData
  settings: ThemeSettingsValue
  menus: Record<string, ThemeMenuItem[]>
  request: { url: string; params: Record<string, string> }
  helpers: LayoutHelpers
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
  /**
   * Optional `v=` query token for `/theme/static/*` URLs (cache busting).
   * Set at theme build time (e.g. random hex, commit sha). When set, the server does not
   * read static files to derive a fingerprint. When omitted, see `.hana-static-fingerprint`
   * under `staticRoot` or a one-time content hash at theme runtime creation.
   */
  staticAssetFingerprint?: string
  hooks?: Partial<CMSThemeHooks>
  companionPlugin?: CMSPlugin
}

export interface CMSThemeHooks {
  [HOOK_KEY.THEME_BEFORE_RENDER]: (context: LayoutContext) => LayoutContext | Promise<LayoutContext>
  [HOOK_KEY.THEME_AFTER_RENDER]: (html: string) => string | Promise<string>
}

export type ThemeFactory = (options?: Record<string, unknown>) => CMSTheme
