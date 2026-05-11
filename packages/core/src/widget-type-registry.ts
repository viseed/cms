import type { CMSPlugin, WidgetTypeDef } from '@viseed/types'

/**
 * In-memory registry of widget types contributed by active plugins.
 * Rebuilt whenever a plugin is enabled or disabled.
 */
export class WidgetTypeRegistry {
  private types = new Map<string, WidgetTypeDef>()

  rebuild(plugins: CMSPlugin[], isActive: (name: string) => boolean): void {
    this.types.clear()
    for (const plugin of plugins) {
      if (!plugin.widgets?.length) continue
      if (!isActive(plugin.name)) continue
      for (const widgetType of plugin.widgets) {
        this.types.set(widgetType.id, widgetType)
      }
    }
  }

  list(): WidgetTypeDef[] {
    return [...this.types.values()]
  }

  get(id: string): WidgetTypeDef | undefined {
    return this.types.get(id)
  }

  listByPlugin(pluginName: string): WidgetTypeDef[] {
    return this.list().filter((t) => t.pluginName === pluginName)
  }

  has(id: string): boolean {
    return this.types.has(id)
  }
}
