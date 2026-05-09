import type {
  PluginManifest,
  PluginRegistryEntry,
  PluginRegistryResponse,
  ThemeManifest,
  ThemeRegistryEntry,
  ThemeRegistryResponse,
} from '@hanano/types'
import { verifyBundleIntegrity } from './integrity'

export interface RegistryClientOptions {
  registryUrl: string
  timeout?: number
}

export class PluginRegistryClient {
  private registryUrl: string
  private timeout: number

  constructor(options: RegistryClientOptions) {
    this.registryUrl = options.registryUrl.replace(/\/$/, '')
    this.timeout = options.timeout ?? 10_000
  }

  async fetchAvailablePlugins(): Promise<PluginRegistryEntry[]> {
    const response = await fetch(`${this.registryUrl}/plugins.json`, {
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as PluginRegistryResponse
    return data.plugins
  }

  async fetchPluginManifest(name: string): Promise<PluginManifest> {
    const response = await fetch(`${this.registryUrl}/plugins/${name}/manifest.json`, {
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Manifest fetch failed for "${name}": ${response.status}`)
    }

    return (await response.json()) as PluginManifest
  }

  async verifyAndLoadBundle(manifest: PluginManifest): Promise<unknown> {
    const isValid = await verifyBundleIntegrity(manifest.bundleUrl, manifest.integrity)
    if (!isValid) {
      throw new Error(
        `Integrity check failed for plugin "${manifest.name}". ` +
          'The bundle may have been tampered with.',
      )
    }

    return import(manifest.bundleUrl)
  }
}

export class ThemeRegistryClient {
  private registryUrl: string
  private timeout: number

  constructor(options: RegistryClientOptions) {
    this.registryUrl = options.registryUrl.replace(/\/$/, '')
    this.timeout = options.timeout ?? 10_000
  }

  async fetchAvailableThemes(): Promise<ThemeRegistryEntry[]> {
    const response = await fetch(`${this.registryUrl}/themes.json`, {
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as ThemeRegistryResponse
    return data.themes
  }

  async fetchThemeManifest(name: string): Promise<ThemeManifest> {
    const response = await fetch(`${this.registryUrl}/themes/${name}/manifest.json`, {
      signal: AbortSignal.timeout(this.timeout),
    })

    if (!response.ok) {
      throw new Error(`Theme manifest fetch failed for "${name}": ${response.status}`)
    }

    return (await response.json()) as ThemeManifest
  }

  async verifyAndLoadThemeBundle(manifest: ThemeManifest): Promise<unknown> {
    const isValid = await verifyBundleIntegrity(manifest.bundleUrl, manifest.integrity)
    if (!isValid) {
      throw new Error(
        `Integrity check failed for theme "${manifest.name}". ` +
          'The bundle may have been tampered with.',
      )
    }

    return import(manifest.bundleUrl)
  }
}
