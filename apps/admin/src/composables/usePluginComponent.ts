import type { Component } from 'vue'
import { getPluginModule } from '../main'

/**
 * Resolves a Vue component by plugin name and export name from the loaded
 * plugin admin bundle map.
 *
 * If the plugin bundle has not yet been loaded (e.g. a plugin without admin
 * menu items), this returns null. Callers should show a loading state or
 * prompt the user to open the Widgets manager in a new tab.
 */
export function usePluginComponent() {
  function resolveComponent(pluginName: string, exportName: string): Component | null {
    const mod = getPluginModule(pluginName)
    if (!mod) return null
    const comp = mod[exportName]
    if (!comp) return null
    return comp as Component
  }

  return { resolveComponent }
}
