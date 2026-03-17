export interface ComponentEntry {
  name: string
  component: unknown
  source: string
}

export interface ComponentRegistry {
  register(name: string, component: unknown, source?: string): void
  get(name: string): unknown | undefined
  has(name: string): boolean
  getAll(): Map<string, ComponentEntry>
  unregister(name: string): boolean
}
