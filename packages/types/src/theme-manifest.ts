export interface ThemeManifest {
  name: string
  version: string
  description: string
  author: string
  bundleUrl: string
  integrity: string
  requiredLayouts: string[]
  screenshots?: string[]
  homepage?: string
  repository?: string
  tags?: string[]
  minCmsVersion?: string
  requiredPlugins?: string[]
  compatiblePlugins?: string[]
}

export interface ThemeRegistryEntry {
  manifest: ThemeManifest
  downloads: number
  createdAt: string
  updatedAt: string
}

export interface ThemeRegistryResponse {
  themes: ThemeRegistryEntry[]
  total: number
}
