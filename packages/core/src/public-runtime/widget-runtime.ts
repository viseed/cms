/**
 * Viseed CMS public widget runtime.
 * Runs in the browser after the theme page loads.
 *
 * Scans all `[data-widget-id]` placeholders, groups them by plugin name
 * (derived from `data-widget-type`, format: `{pluginName}/{typeName}`),
 * fetches each widget's config, dynamically imports the plugin public bundle,
 * and mounts the corresponding Vue component.
 *
 * This file is bundled via Bun.build() on first request to
 * GET /api/public/widget-runtime.js — no separate build step required.
 */

import { createApp } from 'vue'

interface WidgetConfig {
  id: string
  type: string
  config: Record<string, unknown>
  componentExport?: string | null
}

const configCache = new Map<string, WidgetConfig>()
const moduleCache = new Map<string, Record<string, unknown>>()

async function fetchWidgetConfig(id: string): Promise<WidgetConfig | null> {
  if (configCache.has(id)) return configCache.get(id)!
  try {
    const res = await fetch(`/api/widgets/${id}`)
    if (!res.ok) return null
    const data = (await res.json()) as WidgetConfig
    configCache.set(id, data)
    return data
  } catch {
    return null
  }
}

async function loadPluginModule(pluginName: string): Promise<Record<string, unknown> | null> {
  if (moduleCache.has(pluginName)) return moduleCache.get(pluginName)!
  try {
    const mod = (await import(
      /* @vite-ignore */ `/api/public/plugins/${pluginName}/widget.js`
    )) as Record<string, unknown>
    moduleCache.set(pluginName, mod)
    return mod
  } catch (err) {
    console.warn(`[widget-runtime] Failed to load public bundle for plugin "${pluginName}":`, err)
    return null
  }
}

function pluginNameFromType(type: string): string {
  return type.split('/')[0] ?? type
}

function componentNameFromType(type: string): string {
  return type.split('/')[1] ?? type
}

async function mountWidget(el: HTMLElement): Promise<void> {
  const widgetId = el.dataset.widgetId
  const widgetType = el.dataset.widgetType

  if (!widgetId || !widgetType) {
    el.setAttribute('data-widget-error', 'missing-attrs')
    return
  }

  const [config, mod] = await Promise.all([
    fetchWidgetConfig(widgetId),
    loadPluginModule(pluginNameFromType(widgetType)),
  ])

  if (!config) {
    el.setAttribute('data-widget-error', 'config-unavailable')
    return
  }

  if (!mod) {
    el.setAttribute('data-widget-error', 'bundle-unavailable')
    return
  }

  const exportName = config.componentExport ?? componentNameFromType(widgetType)
  const Component = mod[exportName] ?? mod.default

  if (!Component) {
    el.setAttribute('data-widget-error', `component-not-found:${exportName}`)
    return
  }

  el.removeAttribute('data-widget-id')
  el.removeAttribute('data-widget-type')

  const app = createApp(Component as Parameters<typeof createApp>[0], { config: config.config })
  app.mount(el)
}

async function init(): Promise<void> {
  const placeholders = Array.from(
    document.querySelectorAll<HTMLElement>('[data-widget-id]'),
  )

  if (placeholders.length === 0) return

  await Promise.allSettled(placeholders.map((el) => mountWidget(el)))
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
