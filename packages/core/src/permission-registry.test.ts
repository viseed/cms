import { describe, expect, test } from 'bun:test'
import type { CMSPlugin } from '@viseed/types'
import { PERMISSION_CATALOG } from '@viseed/types'
import { PermissionRegistry } from './permission-registry'

function makePlugin(overrides: Partial<CMSPlugin>): CMSPlugin {
  return {
    name: 'test',
    version: '0.0.0',
    ...overrides,
  }
}

const alwaysActive = () => true

describe('PermissionRegistry', () => {
  test('seeds the full built-in catalog with builtin source', () => {
    const registry = new PermissionRegistry()
    registry.rebuild([], alwaysActive)

    const keys = registry.list().map((entry) => entry.key)
    for (const builtin of PERMISSION_CATALOG) {
      expect(keys).toContain(builtin)
    }
    expect(registry.list().every((entry) => entry.source === 'builtin')).toBe(true)
  })

  test('has() recognizes built-in permissions', () => {
    const registry = new PermissionRegistry()
    registry.rebuild([], alwaysActive)
    expect(registry.has('site.content.read')).toBe(true)
    expect(registry.has('pages.publish')).toBe(false)
  })

  test('merges plugin-declared permissions with metadata and plugin source', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({
      name: 'pages',
      permissions: [{ key: 'pages.publish', label: 'Publish pages', group: 'Pages' }],
    })

    registry.rebuild([plugin], alwaysActive)

    expect(registry.has('pages.publish')).toBe(true)
    const entry = registry.list().find((e) => e.key === 'pages.publish')
    expect(entry).toMatchObject({
      key: 'pages.publish',
      label: 'Publish pages',
      group: 'Pages',
      source: 'plugin',
      pluginName: 'pages',
    })
  })

  test('ignores permissions from inactive plugins', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({
      name: 'pages',
      permissions: [{ key: 'pages.publish', label: 'Publish pages' }],
    })

    registry.rebuild([plugin], (name) => name !== 'pages')

    expect(registry.has('pages.publish')).toBe(false)
  })

  test('built-in keys are never overridden by plugin declarations', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({
      name: 'evil',
      permissions: [{ key: 'site.content.read', label: 'Hijacked', group: 'Evil' }],
    })

    registry.rebuild([plugin], alwaysActive)

    const entry = registry.list().find((e) => e.key === 'site.content.read')
    expect(entry?.source).toBe('builtin')
    expect(entry?.label).not.toBe('Hijacked')
  })

  test('collects referenced keys from admin menu items as plugin entries', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({
      name: 'reports',
      admin: {
        menuItems: [
          {
            id: 'reports',
            label: 'Reports',
            icon: 'R',
            path: '/reports',
            requiredPermissions: ['reports.view'],
          },
        ],
      },
    })

    registry.rebuild([plugin], alwaysActive)

    expect(registry.has('reports.view')).toBe(true)
    const entry = registry.list().find((e) => e.key === 'reports.view')
    expect(entry?.source).toBe('plugin')
    expect(entry?.label).toBe('reports.view')
  })

  test('collects referenced route permissions via getRoutePermissions', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({ name: 'pages' })

    registry.rebuild([plugin], alwaysActive, (name) =>
      name === 'pages' ? ['pages.export'] : [],
    )

    expect(registry.has('pages.export')).toBe(true)
  })

  test('a rich PermissionDef from a route carries its metadata into the catalog', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({ name: 'pages' })

    registry.rebuild([plugin], alwaysActive, (name) =>
      name === 'pages'
        ? [{ key: 'pages.publish', label: 'Publish pages', group: 'Pages' }]
        : [],
    )

    const entry = registry.list().find((e) => e.key === 'pages.publish')
    expect(entry).toMatchObject({
      key: 'pages.publish',
      label: 'Publish pages',
      group: 'Pages',
      source: 'plugin',
      pluginName: 'pages',
    })
  })

  test('declared metadata wins over a bare referenced key', () => {
    const registry = new PermissionRegistry()
    const plugin = makePlugin({
      name: 'pages',
      permissions: [{ key: 'pages.export', label: 'Export pages', group: 'Pages' }],
    })

    registry.rebuild([plugin], alwaysActive, () => ['pages.export'])

    const entry = registry.list().find((e) => e.key === 'pages.export')
    expect(entry?.label).toBe('Export pages')
    expect(entry?.group).toBe('Pages')
  })
})
