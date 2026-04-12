import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts'],
  external: ['@hana/types', '@hana/validator', '@hana/core', 'hono', 'drizzle-orm'],
})
