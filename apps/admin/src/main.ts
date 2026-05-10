import type { AuthContextPayload } from '@viseed/types'
import { createApp } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import App from './App.vue'
import ContentEditor from './components/ContentEditor.vue'
import MetaSeoEditor from './components/MetaSeoEditor.vue'
import SchemaOrgBuilder from './components/SchemaOrgBuilder.vue'
import { getAuthContextPayload, useAdminAuthContext } from './composables/useAdminAuthContext'
import { clearPluginManifestCache, fetchPluginManifest } from './composables/usePluginManifest'
import { adminRoutes } from './router/routes'
import GenericPluginView from './views/GenericPluginView.vue'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: adminRoutes,
})

let pluginRoutesRegistered = false

let setupStatusCache: boolean | null = null

export function markSetupComplete(): void {
  setupStatusCache = false
}

async function checkNeedsSetup(): Promise<boolean> {
  if (setupStatusCache !== null) return setupStatusCache
  try {
    const res = await fetch('/api/admin/setup/status', { credentials: 'include' })
    if (!res.ok) {
      setupStatusCache = false
      return false
    }
    const data = (await res.json()) as { needsSetup: boolean }
    setupStatusCache = data.needsSetup === true
  } catch {
    setupStatusCache = false
  }
  return setupStatusCache
}

function isAuthorizedForRoute(
  to: RouteLocationNormalized,
  context: AuthContextPayload | null,
): boolean {
  const meta = to.meta

  if (meta.requiresAuth === true && context?.currentUser == null) {
    return false
  }

  const required = meta.requiredPermissions ?? []
  const granted = new Set(context?.permissions ?? [])
  for (const permission of required) {
    if (!granted.has(permission)) {
      return false
    }
  }

  if (meta.platformOnly === true) {
    const list = context?.permissions ?? []
    if (!list.some((p) => p.startsWith('platform.'))) {
      return false
    }
  }

  return true
}

async function registerPluginAdminRoutes(r: Router) {
  if (pluginRoutesRegistered) return
  const manifest = await fetchPluginManifest()
  if (manifest.plugins.length === 0) return

  for (const plugin of manifest.plugins) {
    let pluginModule: Record<string, unknown> | null = null
    if (plugin.admin.hasBundle) {
      try {
        const v = encodeURIComponent(import.meta.env.VITE_ADMIN_PLUGIN_UI_BUILD_ID)
        pluginModule = await import(
          /* @vite-ignore */ `/api/admin/plugins/${plugin.name}/ui.js?v=${v}`
        )
      } catch (err) {
        console.warn(`Failed to load admin bundle for plugin "${plugin.name}"`, err)
      }
    }

    for (const item of plugin.admin.menuItems) {
      const exportName = item.componentExport
      const component = (exportName && pluginModule?.[exportName]) || GenericPluginView

      r.addRoute({
        path: item.path,
        component: component as Parameters<Router['addRoute']>[0]['component'],
        meta: {
          requiresAuth: true,
          requiredPermissions: item.requiredPermissions,
          siteScoped: item.siteScoped,
          navigation: { label: item.label, icon: item.icon },
          order: item.order,
          pluginName: plugin.name,
        },
      })
    }
  }

  pluginRoutesRegistered = true
}

router.beforeEach(async (to) => {
  const needsSetup = await checkNeedsSetup()

  if (needsSetup) {
    if (to.path !== '/setup') {
      return { path: '/setup', replace: true }
    }
    return true
  }

  if (to.path === '/setup') {
    return { path: '/', replace: true }
  }

  const auth = useAdminAuthContext()
  await auth.initialize()
  const context = getAuthContextPayload()
  const isAuthenticated = context?.currentUser != null

  if (isAuthenticated && !pluginRoutesRegistered) {
    clearPluginManifestCache()
    await registerPluginAdminRoutes(router)
    if (pluginRoutesRegistered) {
      return to.fullPath
    }
  }

  if (to.path === '/login') {
    if (isAuthenticated) {
      return { path: '/', replace: true }
    }
    return true
  }

  if (to.path === '/forbidden') {
    return true
  }

  if (!isAuthorizedForRoute(to, context)) {
    if (to.meta.requiresAuth === true && !isAuthenticated) {
      return {
        path: '/login',
        query: { redirect: to.fullPath },
        replace: true,
      }
    }
    return { path: '/forbidden', replace: true }
  }

  return true
})

;(async () => {
  await registerPluginAdminRoutes(router)

  const app = createApp(App)
  app.component('ContentEditor', ContentEditor)
  app.component('MetaSeoEditor', MetaSeoEditor)
  app.component('SchemaOrgBuilder', SchemaOrgBuilder)
  app.use(router)
  app.mount('#app')

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      app.unmount()
    })
  }
})()
