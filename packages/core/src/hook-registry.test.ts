import { describe, expect, test } from 'bun:test'
import type { ThemeRenderRequestContext } from '@viseed/types'
import { HookRegistry } from './hook-registry'

const requestContext = {
  params: {},
  url: 'http://localhost/',
  query: {},
  path: '/',
} as unknown as ThemeRenderRequestContext

describe('HookRegistry.register / run', () => {
  test('runs all handlers for a hook in registration order', async () => {
    const registry = new HookRegistry()
    const calls: string[] = []

    registry.register('plugin:enabled', (name) => {
      calls.push(`first:${name}`)
    })
    registry.register('plugin:enabled', (name) => {
      calls.push(`second:${name}`)
    })

    await registry.run('plugin:enabled', 'blog')

    expect(calls).toEqual(['first:blog', 'second:blog'])
  })

  test('run is a no-op when no handler is registered', async () => {
    const registry = new HookRegistry()
    await expect(registry.run('plugin:disabled', 'blog')).resolves.toBeUndefined()
  })

  test('awaits async handlers', async () => {
    const registry = new HookRegistry()
    const calls: string[] = []

    registry.register('plugin:enabled', async (name) => {
      await Promise.resolve()
      calls.push(name)
    })

    await registry.run('plugin:enabled', 'blog')
    expect(calls).toEqual(['blog'])
  })
})

describe('HookRegistry.runWaterfallAt', () => {
  test('flows the returned value into the targeted argument', async () => {
    const registry = new HookRegistry()

    registry.register('theme:beforeRender', (_layoutKey, data) => ({ ...data, b: 2 }))
    registry.register('theme:beforeRender', (_layoutKey, data) => ({ ...data, c: 3 }))

    const result = await registry.runWaterfallAt(
      'theme:beforeRender',
      1,
      'home',
      { a: 1 },
      requestContext,
    )

    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })

  test('keeps the previous value when a handler returns undefined', async () => {
    const registry = new HookRegistry()

    registry.register('theme:beforeRender', (_layoutKey, data) => ({ ...data, b: 2 }))
    registry.register('theme:beforeRender', () => undefined as unknown as Record<string, unknown>)

    const result = await registry.runWaterfallAt(
      'theme:beforeRender',
      1,
      'home',
      { a: 1 },
      requestContext,
    )

    expect(result).toEqual({ a: 1, b: 2 })
  })

  test('returns the initial argument untouched when no handler is registered', async () => {
    const registry = new HookRegistry()
    const result = await registry.runWaterfallAt(
      'theme:beforeRender',
      1,
      'home',
      { a: 1 },
      requestContext,
    )
    expect(result).toEqual({ a: 1 })
  })
})

describe('HookRegistry.runWaterfall', () => {
  test('defaults to flowing the last argument', async () => {
    const registry = new HookRegistry()

    registry.register('theme:beforeRender', () => ({ flowed: true }))

    const result = await registry.runWaterfall(
      'theme:beforeRender',
      'home',
      { a: 1 },
      requestContext,
    )
    expect(result).toEqual({ flowed: true })
  })
})

describe('HookRegistry.clear', () => {
  test('removes all registered handlers', async () => {
    const registry = new HookRegistry()
    const calls: string[] = []

    registry.register('plugin:enabled', (name) => {
      calls.push(name)
    })
    registry.clear()

    await registry.run('plugin:enabled', 'blog')
    expect(calls).toEqual([])
  })
})
