/**
 * Merge multiple Drizzle schema objects from core and plugins into a single schema.
 * Drizzle schemas are plain JS objects, so merging is a simple spread operation.
 * Throws on key conflicts to prevent silent overwrites.
 */
export function mergeSchemas(...schemas: Array<Record<string, unknown>>): Record<string, unknown> {
  const merged: Record<string, unknown> = {}

  for (const schema of schemas) {
    for (const [key, value] of Object.entries(schema)) {
      if (key in merged) {
        throw new Error(
          `Schema conflict: table "${key}" is defined by multiple plugins. ` +
            'Use unique prefixed table names to avoid collisions.',
        )
      }
      merged[key] = value
    }
  }

  return merged
}
