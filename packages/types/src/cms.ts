import type { CMSPlugin } from './plugin'
import type { CMSTheme } from './theme'

export interface DatabaseConfig {
  driver: 'sqlite' | 'turso' | 'postgres'
  url: string
  authToken?: string
}

export interface AdminConfig {
  path?: string
  enabled?: boolean
}

export interface CMSConfig {
  db: DatabaseConfig
  admin?: AdminConfig
  plugins?: Array<CMSPlugin>
  theme?: CMSTheme
  server?: {
    port?: number
    hostname?: string
  }
}

export interface HanaCMS {
  use(plugin: CMSPlugin): HanaCMS
  launch(): unknown
  getDatabase(): unknown
  getPlugins(): Array<CMSPlugin>
  getTheme(): CMSTheme | undefined
  hasTheme(): boolean
}
