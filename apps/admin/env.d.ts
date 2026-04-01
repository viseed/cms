/// <reference types="vite/client" />

import type { Permission } from '@hana/types'

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
