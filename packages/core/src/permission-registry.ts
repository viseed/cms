import type { CMSPlugin, PermissionDef, PermissionCatalogEntry, PermissionKey } from '@viseed/types'
import { BUILTIN_PERMISSION_DEFS } from '@viseed/types'

/** A permission contribution: either a full def or a bare key string. */
type PermissionContribution = PermissionKey | PermissionDef

function toDef(contribution: PermissionContribution): {
  key: PermissionKey
  label: string
  description?: string
  group?: string
} {
  if (typeof contribution === 'string') {
    return { key: contribution, label: contribution }
  }
  return {
    key: contribution.key,
    label: contribution.label,
    description: contribution.description,
    group: contribution.group,
  }
}

/**
 * In-memory registry of the dynamic permission catalog: built-in permissions
 * plus everything contributed by active plugins (declared metadata + keys
 * referenced by admin menu items and API routes). Rebuilt whenever a plugin is
 * enabled or disabled, mirroring the other core registries.
 *
 * Built-in entries always win: a plugin can reuse a built-in key but can never
 * override its metadata or source.
 */
export class PermissionRegistry {
  private entries = new Map<string, PermissionCatalogEntry>()

  rebuild(
    plugins: CMSPlugin[],
    isActive: (name: string) => boolean,
    getRoutePermissions?: (pluginName: string) => Iterable<PermissionContribution>,
  ): void {
    this.entries.clear()

    for (const def of BUILTIN_PERMISSION_DEFS) {
      this.entries.set(def.key, { ...def, source: 'builtin' })
    }

    for (const plugin of plugins) {
      if (!isActive(plugin.name)) continue

      for (const def of plugin.permissions ?? []) {
        this.addPluginEntry(plugin.name, toDef(def))
      }

      for (const menuItem of plugin.admin?.menuItems ?? []) {
        for (const key of menuItem.requiredPermissions ?? []) {
          this.addPluginEntry(plugin.name, { key, label: key })
        }
      }

      for (const contribution of getRoutePermissions?.(plugin.name) ?? []) {
        this.addPluginEntry(plugin.name, toDef(contribution))
      }
    }
  }

  /**
   * Insert a plugin-contributed permission. Built-in keys are never replaced;
   * the first rich definition wins, and a bare reference (label === key) only
   * fills in a key that has no richer definition yet.
   */
  private addPluginEntry(
    pluginName: string,
    def: { key: PermissionKey; label: string; description?: string; group?: string },
  ): void {
    const existing = this.entries.get(def.key)
    if (existing?.source === 'builtin') return

    const incomingIsBare =
      def.label === def.key && def.group === undefined && def.description === undefined
    if (existing) {
      const existingIsBare =
        existing.label === existing.key &&
        existing.group === undefined &&
        existing.description === undefined
      // Keep an existing rich entry; only upgrade a bare entry to a rich one.
      if (!existingIsBare || incomingIsBare) return
    }

    this.entries.set(def.key, {
      key: def.key,
      label: def.label,
      description: def.description,
      group: def.group,
      source: 'plugin',
      pluginName,
    })
  }

  list(): PermissionCatalogEntry[] {
    return [...this.entries.values()]
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }
}
