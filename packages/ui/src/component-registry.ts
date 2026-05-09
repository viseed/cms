import type { ComponentEntry, ComponentRegistry } from '@hanano/types'
import { type Component, type ShallowRef, shallowRef } from 'vue'

const registry = new Map<string, { component: ShallowRef<Component>; source: string }>()

export const componentRegistry: ComponentRegistry = {
  register(name: string, component: unknown, source = 'core'): void {
    const existing = registry.get(name)
    if (existing) {
      existing.component.value = component as Component
      existing.source = source
    } else {
      registry.set(name, {
        component: shallowRef(component as Component),
        source,
      })
    }
  },

  get(name: string): ShallowRef<Component> | undefined {
    return registry.get(name)?.component
  },

  has(name: string): boolean {
    return registry.has(name)
  },

  getAll(): Map<string, ComponentEntry> {
    const entries = new Map<string, ComponentEntry>()
    for (const [name, { component, source }] of registry) {
      entries.set(name, { name, component: component.value, source })
    }
    return entries
  },

  unregister(name: string): boolean {
    return registry.delete(name)
  },
}

/**
 * Resolve a component from the registry, falling back to a default.
 * Used in admin UI templates: <component :is="resolveComponent('PostCard', DefaultPostCard)" />
 */
export function resolveComponent(name: string, fallback: Component): ShallowRef<Component> {
  if (!registry.has(name)) {
    componentRegistry.register(name, fallback, 'default')
  }
  return registry.get(name)!.component
}
