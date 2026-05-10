import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts'],
  external: ['@viseed/types', '@viseed/validator', '@viseed/core', 'hono', 'drizzle-orm'],
})
