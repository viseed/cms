import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import type { AuthContextPayload } from '@hana/types'
import App from './App.vue'
import { adminRoutes } from './router/routes'
import { getAuthContextPayload, useAdminAuthContext } from './composables/useAdminAuthContext'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: adminRoutes,
})

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

router.beforeEach(async (to) => {
  const auth = useAdminAuthContext()
  await auth.initialize()
  const context = getAuthContextPayload()
  const isAuthenticated = context?.currentUser != null

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

const app = createApp(App)
app.use(router)
app.mount('#app')
