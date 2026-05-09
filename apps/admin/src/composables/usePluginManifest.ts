import type { PluginAdminMenuItem } from '@hanano/types'
import { adminFetch } from '../lib/admin-api'

export interface PluginManifestEntry {
  name: string
  version: string
  admin: {
    menuItems: PluginAdminMenuItem[]
    hasBundle: boolean
  }
}

export interface PluginManifestResponse {
  plugins: PluginManifestEntry[]
}

let cached: PluginManifestResponse | null = null

export async function fetchPluginManifest(): Promise<PluginManifestResponse> {
  if (cached) return cached

  try {
    const res = await adminFetch('/api/admin/plugin-manifest')
    if (!res.ok) return { plugins: [] }
    const data: PluginManifestResponse = await res.json()
    cached = data
    return data
  } catch {
    return { plugins: [] }
  }
}

export function clearPluginManifestCache(): void {
  cached = null
}
