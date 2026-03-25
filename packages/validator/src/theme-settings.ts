import { z } from 'zod'

// ---------------------------------------------------------------------------
// Individual field schemas
// ---------------------------------------------------------------------------

const fieldBaseSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  required: z.boolean().optional(),
})

export const themeSettingsTextFieldSchema = fieldBaseSchema.extend({
  type: z.literal('text'),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
})

export const themeSettingsTextareaFieldSchema = fieldBaseSchema.extend({
  type: z.literal('textarea'),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  rows: z.number().int().positive().optional(),
})

export const themeSettingsBooleanFieldSchema = fieldBaseSchema.extend({
  type: z.literal('boolean'),
  default: z.boolean().optional(),
})

export const themeSettingsSelectOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
})

export const themeSettingsSelectFieldSchema = fieldBaseSchema.extend({
  type: z.literal('select'),
  options: z.array(themeSettingsSelectOptionSchema).min(1),
  default: z.string().optional(),
})

export const themeSettingsColorFieldSchema = fieldBaseSchema.extend({
  type: z.literal('color'),
  default: z
    .string()
    .regex(/^(#[0-9a-fA-F]{3,8}|rgba?\(.+\))$/, 'Must be a valid CSS color')
    .optional(),
})

export const themeSettingsImageFieldSchema = fieldBaseSchema.extend({
  type: z.literal('image'),
  default: z.string().optional(),
  accept: z.array(z.string()).optional(),
})

export const themeSettingsLinkItemSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().min(1),
  target: z.enum(['_self', '_blank']).optional(),
})

export const themeSettingsLinkListFieldSchema = fieldBaseSchema.extend({
  type: z.literal('link_list'),
  default: z.array(themeSettingsLinkItemSchema).optional(),
  maxItems: z.number().int().positive().optional(),
})

/** Discriminated union validator for any settings field. */
export const themeSettingsFieldSchema = z.discriminatedUnion('type', [
  themeSettingsTextFieldSchema,
  themeSettingsTextareaFieldSchema,
  themeSettingsBooleanFieldSchema,
  themeSettingsSelectFieldSchema,
  themeSettingsColorFieldSchema,
  themeSettingsImageFieldSchema,
  themeSettingsLinkListFieldSchema,
])

// ---------------------------------------------------------------------------
// Section and top-level schema validators
// ---------------------------------------------------------------------------

export const themeSettingsSectionSchema = z.object({
  key: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  fields: z.array(themeSettingsFieldSchema).min(1),
})

export const themeSettingsSchemaValidator = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be a semver string e.g. "1.0.0"'),
  sections: z.array(themeSettingsSectionSchema).min(1),
})

// ---------------------------------------------------------------------------
// Runtime value validator — validates a flat key→value map
// ---------------------------------------------------------------------------

export const themeSettingsValueSchema = z.record(z.string(), z.unknown())

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------

export type ThemeSettingsFieldInput = z.infer<typeof themeSettingsFieldSchema>
export type ThemeSettingsSectionInput = z.infer<typeof themeSettingsSectionSchema>
export type ThemeSettingsSchemaInput = z.infer<typeof themeSettingsSchemaValidator>
export type ThemeSettingsValueInput = z.infer<typeof themeSettingsValueSchema>
