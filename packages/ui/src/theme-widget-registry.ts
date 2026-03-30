import type { ThemeExtensionSlotId, ThemeExtensionWidgetRegistration } from '@hana/types'

const registry = new Map<string, Map<string, ThemeExtensionWidgetRegistration>>()

function getSourceMap(source: string): Map<string, ThemeExtensionWidgetRegistration> {
  let inner = registry.get(source)
  if (!inner) {
    inner = new Map()
    registry.set(source, inner)
  }
  return inner
}

function sortWidgets(
  a: ThemeExtensionWidgetRegistration,
  b: ThemeExtensionWidgetRegistration,
): number {
  const pa = a.priority ?? 0
  const pb = b.priority ?? 0
  if (pa !== pb) return pa - pb
  return a.id.localeCompare(b.id)
}

export const themeWidgetRegistry = {
  register(widget: ThemeExtensionWidgetRegistration): void {
    const inner = getSourceMap(widget.source)
    inner.set(widget.id, { ...widget })
  },

  unregister(source: string, id: string): boolean {
    const inner = registry.get(source)
    if (!inner) return false
    const ok = inner.delete(id)
    if (inner.size === 0) registry.delete(source)
    return ok
  },

  unregisterAllFromSource(source: string): number {
    const inner = registry.get(source)
    if (!inner) return 0
    const n = inner.size
    registry.delete(source)
    return n
  },

  getWidgetsForSlot(slot: ThemeExtensionSlotId): ThemeExtensionWidgetRegistration[] {
    const out: ThemeExtensionWidgetRegistration[] = []
    for (const inner of registry.values()) {
      for (const widget of inner.values()) {
        if (widget.slot === slot) out.push(widget)
      }
    }
    out.sort(sortWidgets)
    return out
  },

  has(source: string, id: string): boolean {
    return registry.get(source)?.has(id) ?? false
  },

  getAll(): ThemeExtensionWidgetRegistration[] {
    const out: ThemeExtensionWidgetRegistration[] = []
    for (const inner of registry.values()) {
      out.push(...inner.values())
    }
    out.sort((a, b) => {
      const bySource = a.source.localeCompare(b.source)
      if (bySource !== 0) return bySource
      return sortWidgets(a, b)
    })
    return out
  },

  clear(): void {
    registry.clear()
  },
}
