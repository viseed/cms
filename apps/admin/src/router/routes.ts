import type { Permission } from '@hana/types'
import type { RouteRecordRaw } from 'vue-router'

type AdminRouteMeta = {
  requiresAuth?: boolean
  requiredPermissions?: Array<Permission>
  navigation?: { label: string; icon: string }
  platformOnly?: boolean
  siteScoped?: boolean
  order?: number
  pluginName?: string
}

function meta(m: AdminRouteMeta): AdminRouteMeta {
  return m
}

export const adminRoutes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: () => import('../views/DashboardView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['site.content.read'],
      navigation: { label: 'Dashboard', icon: '◫' },
      siteScoped: true,
      order: 0,
    }),
  },
  {
    path: '/content',
    component: () => import('../views/ContentView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['site.content.read'],
      navigation: { label: 'Content', icon: '✎' },
      siteScoped: true,
      order: 10,
    }),
  },
  {
    path: '/media',
    component: () => import('../views/MediaView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['site.media.read'],
      navigation: { label: 'Media', icon: '⬡' },
      siteScoped: true,
      order: 30,
    }),
  },
  {
    path: '/plugins',
    component: () => import('../views/PluginsView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['platform.sites.read'],
      navigation: { label: 'Plugins', icon: '⚙' },
      platformOnly: true,
      order: 90,
    }),
  },
  {
    path: '/themes',
    component: () => import('../views/ThemesView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['platform.sites.read'],
      navigation: { label: 'Themes', icon: '◈' },
      platformOnly: true,
      order: 91,
    }),
  },
  {
    path: '/themes/:name/settings',
    component: () => import('../views/ThemeSettingsView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['site.content.read'],
      siteScoped: true,
    }),
  },
  {
    path: '/sites',
    component: () => import('../views/SiteManagementView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['platform.sites.manage'],
      navigation: { label: 'Sites', icon: '◇' },
      platformOnly: true,
      order: 92,
    }),
  },
  {
    path: '/login',
    component: () => import('../views/LoginView.vue'),
    meta: meta({
      requiresAuth: false,
    }),
  },
  {
    path: '/forbidden',
    component: () => import('../views/ForbiddenView.vue'),
    meta: meta({
      requiresAuth: false,
    }),
  },
]
