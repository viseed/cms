// ---------------------------------------------------------------------------
// Theme Settings Schema — field type definitions
// ---------------------------------------------------------------------------

export interface ThemeSettingsFieldBase {
  /** Unique key within its section (or at root level). */
  key: string
  /** Human-readable label shown in the admin form. */
  label: string
  /** Optional helper text shown below the field. */
  description?: string
  /** Whether the field must have a non-empty value. */
  required?: boolean
}

export interface ThemeSettingsTextField extends ThemeSettingsFieldBase {
  type: 'text'
  default?: string
  placeholder?: string
  /** Maximum character count hint for the admin UI. */
  maxLength?: number
}

export interface ThemeSettingsTextareaField extends ThemeSettingsFieldBase {
  type: 'textarea'
  default?: string
  placeholder?: string
  rows?: number
}

export interface ThemeSettingsBooleanField extends ThemeSettingsFieldBase {
  type: 'boolean'
  default?: boolean
}

export interface ThemeSettingsSelectOption {
  value: string
  label: string
}

export interface ThemeSettingsSelectField extends ThemeSettingsFieldBase {
  type: 'select'
  options: ThemeSettingsSelectOption[]
  default?: string
}

export interface ThemeSettingsColorField extends ThemeSettingsFieldBase {
  type: 'color'
  /** CSS hex or rgba default, e.g. "#ffffff". */
  default?: string
}

export interface ThemeSettingsImageField extends ThemeSettingsFieldBase {
  type: 'image'
  /** URL or relative path used as default. */
  default?: string
  /** Accepted MIME types hint for the admin file picker. */
  accept?: string[]
}

export interface ThemeSettingsLinkItem {
  label: string
  url: string
  /** Defaults to "_self" when omitted. */
  target?: '_self' | '_blank'
}

export interface ThemeSettingsLinkListField extends ThemeSettingsFieldBase {
  type: 'link_list'
  default?: ThemeSettingsLinkItem[]
  /** Maximum number of links the admin UI will allow. */
  maxItems?: number
}

/** Sub-field definition for each item inside an item_list field. */
export interface ThemeSettingsItemField {
  key: string
  label: string
  /** 'text' and 'image' both render as a URL/text input; 'boolean' renders as a checkbox. */
  type: 'text' | 'image' | 'boolean'
  required?: boolean
  placeholder?: string
}

export interface ThemeSettingsItemListField extends ThemeSettingsFieldBase {
  type: 'item_list'
  /** Key of the sub-field used as the thumbnail image in the grid UI. */
  imageKey?: string
  /** Schema defining what sub-fields each item has. */
  itemSchema: ThemeSettingsItemField[]
  maxItems?: number
  default?: Record<string, unknown>[]
}

/** Discriminated union of all supported field types. */
export type ThemeSettingsField =
  | ThemeSettingsTextField
  | ThemeSettingsTextareaField
  | ThemeSettingsBooleanField
  | ThemeSettingsSelectField
  | ThemeSettingsColorField
  | ThemeSettingsImageField
  | ThemeSettingsLinkListField
  | ThemeSettingsItemListField

// ---------------------------------------------------------------------------
// Groups / sections — for structured admin form rendering
// ---------------------------------------------------------------------------

export interface ThemeSettingsSection {
  /** Unique section key, used as namespace prefix in flat value maps. */
  key: string
  /** Human-readable section title shown as a heading in the admin form. */
  title: string
  /** Optional short description shown below the section heading. */
  description?: string
  fields: ThemeSettingsField[]
}

// ---------------------------------------------------------------------------
// Top-level schema — what a theme declares in CMSTheme.settingsSchema
// ---------------------------------------------------------------------------

export interface ThemeSettingsSchema {
  /**
   * Schema version string (semver-style, e.g. "1.0.0").
   * Allows future migration helpers to detect and upgrade stored values.
   */
  version: string
  /** Named sections grouping related fields together. */
  sections: ThemeSettingsSection[]
}

// ---------------------------------------------------------------------------
// Runtime value map — flat key → value, resolved at render time
// ---------------------------------------------------------------------------

/**
 * The actual settings stored/passed at runtime.
 * Keys follow the pattern "<sectionKey>.<fieldKey>" for sectioned fields,
 * preserving the hierarchy without nesting.
 */
export interface ThemeSettingsValue {
  [key: string]: unknown
}

/**
 * Resolve default values from a schema into a flat ThemeSettingsValue map.
 * Useful for seeding initial settings or filling missing keys.
 */
export function resolveDefaultSettings(schema: ThemeSettingsSchema): ThemeSettingsValue {
  const defaults: ThemeSettingsValue = {}

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const key = `${section.key}.${field.key}`
      if ('default' in field && field.default !== undefined) {
        defaults[key] = field.default
      }
    }
  }

  return defaults
}
