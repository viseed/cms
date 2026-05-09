import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts'],
  external: ['@hanano/types', '@hanano/core', 'drizzle-orm'],
})
