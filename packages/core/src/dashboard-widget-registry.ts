import type { CMSPlugin, DashboardWidgetDef } from '@viseed/types'

/**
 * In-memory registry of dashboard widgets contributed by active plugins.
 * Rebuilt whenever a plugin is enabled or disabled.
 */
export class DashboardWidgetRegistry {
  private widgets = new Map<string, DashboardWidgetDef>()

  rebuild(plugins: CMSPlugin[], isActive: (name: string) => boolean): void {
    this.widgets.clear()
    for (const plugin of plugins) {
      if (!plugin.dashboardWidgets?.length) continue
      if (!isActive(plugin.name)) continue
      for (const widget of plugin.dashboardWidgets) {
        this.widgets.set(widget.id, widget)
      }
    }
  }

  list(): DashboardWidgetDef[] {
    return [...this.widgets.values()]
  }

  get(id: string): DashboardWidgetDef | undefined {
    return this.widgets.get(id)
  }

  has(id: string): boolean {
    return this.widgets.has(id)
  }
}
