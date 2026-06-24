import type { CMSPlugin, StorageProviderDef } from '@viseed/types'

/**
 * In-memory registry of media storage providers contributed by active plugins.
 * Rebuilt whenever a plugin is enabled or disabled (mirrors
 * {@link WidgetTypeRegistry}). The built-in `local` provider is NOT stored here
 * — core handles it directly.
 */
export class StorageProviderRegistry {
  private providers = new Map<string, StorageProviderDef>()

  rebuild(plugins: CMSPlugin[], isActive: (name: string) => boolean): void {
    this.providers.clear()
    for (const plugin of plugins) {
      if (!plugin.storageProviders?.length) continue
      if (!isActive(plugin.name)) continue
      for (const provider of plugin.storageProviders) {
        this.providers.set(provider.type, provider)
      }
    }
  }

  get(type: string): StorageProviderDef | undefined {
    return this.providers.get(type)
  }

  list(): StorageProviderDef[] {
    return [...this.providers.values()]
  }

  has(type: string): boolean {
    return this.providers.has(type)
  }

  /** Names of fields that must be encrypted at rest for the given provider. */
  secretFieldsOf(type: string): string[] {
    const provider = this.providers.get(type)
    if (!provider) return []
    return provider.fields.filter((field) => field.secret).map((field) => field.name)
  }
}
