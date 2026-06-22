import type { Permission } from '@viseed/types'
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
    path: '/widgets',
    component: () => import('../views/WidgetsView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['site.widgets.read'],
      navigation: { label: 'Widgets', icon: '❖' },
      siteScoped: true,
      order: 25,
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
    path: '/theme-settings',
    component: () => import('../views/ActiveThemeSettingsView.vue'),
    meta: meta({
      requiresAuth: true,
      requiredPermissions: ['platform.sites.read'],
      navigation: { label: 'Theme Settings', icon: '◉' },
      platformOnly: true,
      order: 92,
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
      order: 93,
    }),
  },
  {
    path: '/setup',
    component: () => import('../views/SetupView.vue'),
    meta: meta({ requiresAuth: false }),
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
