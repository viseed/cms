export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  bundleUrl: string
  integrity: string
  schemaSql?: string[]
  adminComponents?: string[]
  homepage?: string
  repository?: string
  tags?: string[]
}

export interface PluginRegistryEntry {
  manifest: PluginManifest
  downloads: number
  createdAt: string
  updatedAt: string
}

export interface PluginRegistryResponse {
  plugins: PluginRegistryEntry[]
  total: number
}
