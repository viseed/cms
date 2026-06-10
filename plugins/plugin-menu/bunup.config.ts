import { defineConfig } from 'bunup'

export default defineConfig({
  sourcemap: 'linked',
  external: ['@viseed/types', '@viseed/core', 'hono', 'drizzle-orm'],
})
