/// <reference types="vite/client" />

// biome-ignore lint/correctness/noUnusedVariables: merges with vite/client ImportMetaEnv
interface ImportMetaEnv {
  /** Random id (10 hex chars) injected at each admin build for `?v=` on plugin ui.js URLs. */
  readonly VITE_ADMIN_PLUGIN_UI_BUILD_ID: string
}

import type { Permission } from '@hanano/types'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiredPermissions?: Array<Permission>
    navigation?: { label: string; icon: string }
    platformOnly?: boolean
    siteScoped?: boolean
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
