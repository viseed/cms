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
  plugins?: Array<import('./plugin').CMSPlugin>
  server?: {
    port?: number
    hostname?: string
  }
}

export interface HanabiCMS {
  use(plugin: import('./plugin').CMSPlugin): HanabiCMS
  launch(): unknown
  getDatabase(): unknown
  getPlugins(): Array<import('./plugin').CMSPlugin>
}
