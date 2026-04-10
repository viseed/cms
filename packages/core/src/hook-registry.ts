import type { CMSHookName, CMSPluginHooks } from '@hana/types'

type HookHandler = CMSPluginHooks[CMSHookName]

export class HookRegistry {
  private hooks = new Map<CMSHookName, HookHandler[]>()

  register<K extends CMSHookName>(name: K, handler: CMSPluginHooks[K]): void {
    const handlers = this.hooks.get(name) ?? []
    handlers.push(handler as HookHandler)
    this.hooks.set(name, handlers)
  }

  async run<K extends CMSHookName>(name: K, ...args: Parameters<CMSPluginHooks[K]>): Promise<void> {
    const handlers = this.hooks.get(name) ?? []
    for (const handler of handlers) {
      await (handler as (...a: unknown[]) => unknown)(...args)
    }
  }

  /**
   * Run handlers in sequence, passing each handler's return value
   * into `args[flowIndex]` for the next handler (waterfall pattern).
   * Defaults to last argument when `flowIndex` is omitted.
   */
  async runWaterfall<K extends CMSHookName>(
    name: K,
    ...args: Parameters<CMSPluginHooks[K]>
  ): Promise<unknown> {
    return this.runWaterfallAt(name, args.length - 1, ...args)
  }

  async runWaterfallAt<K extends CMSHookName>(
    name: K,
    flowIndex: number,
    ...args: Parameters<CMSPluginHooks[K]>
  ): Promise<unknown> {
    const handlers = this.hooks.get(name) ?? []
    const mutableArgs = [...args] as unknown[]

    for (const handler of handlers) {
      const result = await (handler as (...a: unknown[]) => unknown)(...mutableArgs)
      if (result !== undefined) {
        mutableArgs[flowIndex] = result
      }
    }

    return mutableArgs[flowIndex]
  }

  clear(): void {
    this.hooks.clear()
  }
}
