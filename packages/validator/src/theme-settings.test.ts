import { describe, expect, test } from 'bun:test'
import {
  themeSettingsFieldSchema,
  themeSettingsSchemaValidator,
  themeSettingsValueSchema,
} from './theme-settings'

describe('themeSettingsFieldSchema', () => {
  test('accepts a text field', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'title',
      label: 'Title',
      type: 'text',
      maxLength: 80,
    })
    expect(result.success).toBe(true)
  })

  test('accepts a select field with options', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: [{ value: 'grid', label: 'Grid' }],
    })
    expect(result.success).toBe(true)
  })

  test('rejects a select field without options', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'layout',
      label: 'Layout',
      type: 'select',
      options: [],
    })
    expect(result.success).toBe(false)
  })

  test('rejects an invalid color default', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'brand',
      label: 'Brand',
      type: 'color',
      default: 'not-a-color',
    })
    expect(result.success).toBe(false)
  })

  test('accepts a valid hex color default', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'brand',
      label: 'Brand',
      type: 'color',
      default: '#3366ff',
    })
    expect(result.success).toBe(true)
  })

  test('rejects an unknown field type', () => {
    const result = themeSettingsFieldSchema.safeParse({
      key: 'x',
      label: 'X',
      type: 'datepicker',
    })
    expect(result.success).toBe(false)
  })
})

describe('themeSettingsSchemaValidator', () => {
  test('accepts a valid settings schema', () => {
    const result = themeSettingsSchemaValidator.safeParse({
      version: '1.0.0',
      sections: [
        {
          key: 'general',
          title: 'General',
          fields: [{ key: 'siteName', label: 'Site name', type: 'text' }],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  test('rejects a non-semver version', () => {
    const result = themeSettingsSchemaValidator.safeParse({
      version: 'v1',
      sections: [{ key: 'g', title: 'G', fields: [{ key: 'a', label: 'A', type: 'text' }] }],
    })
    expect(result.success).toBe(false)
  })

  test('rejects an empty sections array', () => {
    const result = themeSettingsSchemaValidator.safeParse({ version: '1.0.0', sections: [] })
    expect(result.success).toBe(false)
  })

  test('rejects a section with no fields', () => {
    const result = themeSettingsSchemaValidator.safeParse({
      version: '1.0.0',
      sections: [{ key: 'g', title: 'G', fields: [] }],
    })
    expect(result.success).toBe(false)
  })
})

describe('themeSettingsValueSchema', () => {
  test('accepts a flat key-value map', () => {
    const result = themeSettingsValueSchema.safeParse({ 'general.siteName': 'Viseed', dark: true })
    expect(result.success).toBe(true)
  })
})
