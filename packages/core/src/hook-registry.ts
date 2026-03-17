import type { CMSHookName, CMSPluginHooks } from '@hanabi/types'

type HookHandler = CMSPluginHooks[CMSHookName]

export class HookRegistry {
  private hooks = new Map<CMSHookName, HookHandler[]>()

  register<K extends CMSHookName>(name: K, handler: CMSPluginHooks[K]): void {
    const handlers = this.hooks.get(name) ?? []
    handlers.push(handler as HookHandler)
    this.hooks.set(name, handlers)
  }

  async run<K extends CMSHookName>(
    name: K,
    ...args: Parameters<CMSPluginHooks[K]>
  ): Promise<void> {
    const handlers = this.hooks.get(name) ?? []
    for (const handler of handlers) {
      await (handler as (...a: unknown[]) => unknown)(...args)
    }
  }

  clear(): void {
    this.hooks.clear()
  }
}
