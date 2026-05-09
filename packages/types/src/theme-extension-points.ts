/**
 * Theme extension points — regions, slots, and widget contracts.
 *
 * Plugins contribute widget metadata (logic / component identity); themes decide
 * where slots appear in `.eta` layouts and which regions exist.
 */

// ---------------------------------------------------------------------------
// Regions (MVP) — themes expose these in templates as injection boundaries
// ---------------------------------------------------------------------------

export type ThemeExtensionRegionId =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'hero'
  | 'belowPost'
  | 'afterContent'

/** All MVP region ids (runtime validation / iteration). */
export const THEME_EXTENSION_REGION_IDS: ThemeExtensionRegionId[] = [
  'header',
  'footer',
  'sidebar',
  'hero',
  'belowPost',
  'afterContent',
]

// ---------------------------------------------------------------------------
// Slots — arbitrary string ids (theme-defined); MVP regions are the standard set
// ---------------------------------------------------------------------------

/**
 * Slot id for extension injection. Any non-empty string a theme documents.
 * Common patterns: a `ThemeExtensionRegionId`, or `region:qualifier` (e.g.
 * `sidebar:before`). Custom theme slots use strings the theme alone defines;
 * plugins target ids from the active theme manifest or docs.
 */
export type ThemeExtensionSlotId = string

// ---------------------------------------------------------------------------
// Theme manifest — optional declaration of slots this theme renders
// ---------------------------------------------------------------------------

export interface ThemeExtensionSlotManifestEntry {
  id: ThemeExtensionSlotId
  /** Human-readable name for docs / future admin UI. */
  label?: string
}

export interface ThemeExtensionManifest {
  /**
   * Slots this theme template(s) actually render. Plugins should target these ids.
   * Omitted keys imply theme does not guarantee that region/slot exists.
   */
  slots?: ThemeExtensionSlotManifestEntry[]
}

// ---------------------------------------------------------------------------
// Widget contract — plugin contribution metadata (no runtime HTML / instances)
// ---------------------------------------------------------------------------

export type ThemeExtensionWidgetKind = 'html' | 'component'

/**
 * Static registration: what a plugin declares so core can merge and order widgets.
 * Actual HTML or component instance is resolved at render time (core / hooks), not here.
 */
export interface ThemeExtensionWidgetDescriptor {
  /** Unique within the contributing plugin. */
  id: string
  /** Target slot; must match a slot the active theme exposes when manifest is used. */
  slot: ThemeExtensionSlotId
  /** Lower numbers render first; default 0. */
  priority?: number
  kind: ThemeExtensionWidgetKind
  /** When kind === 'component', registry key (e.g. admin ComponentRegistry name). */
  componentId?: string
}

/**
 * Fully qualified widget registration including plugin source (after core normalizes).
 */
export interface ThemeExtensionWidgetRegistration extends ThemeExtensionWidgetDescriptor {
  /** npm scope or plugin id, e.g. `@hanano/plugin-blog`. */
  source: string
}
