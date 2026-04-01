import type { RouteRecordRaw } from 'vue-router'
import type { Permission } from '@hana/types'

type AdminRouteMeta = {
  requiresAuth?: boolean
  requiredPermissions?: Array<Permission>
  navigation?: { label: string; icon: string }
  platformOnly?: boolean
  siteScoped?: boolean
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
