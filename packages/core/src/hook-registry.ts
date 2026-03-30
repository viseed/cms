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
   * as the last argument to the next handler (waterfall pattern).
   * Used by hooks like `theme:beforeRender` where plugins modify data.
   */
  async runWaterfall<K extends CMSHookName>(
    name: K,
    ...args: Parameters<CMSPluginHooks[K]>
  ): Promise<Parameters<CMSPluginHooks[K]> extends [...infer _Init, infer Last] ? Last : never> {
    const handlers = this.hooks.get(name) ?? []
    const mutableArgs = [...args] as unknown[]
    const lastIdx = mutableArgs.length - 1

    for (const handler of handlers) {
      const result = await (handler as (...a: unknown[]) => unknown)(...mutableArgs)
      if (result !== undefined) {
        mutableArgs[lastIdx] = result
      }
    }

    return mutableArgs[lastIdx] as Parameters<CMSPluginHooks[K]> extends [
      ...infer _Init,
      infer Last,
    ]
      ? Last
      : never
  }

  clear(): void {
    this.hooks.clear()
  }
}
