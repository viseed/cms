import { defineConfig } from 'bunup'

export default defineConfig({
  entry: ['src/index.ts', 'src/schema.ts'],
  external: ['@viseed/types', '@viseed/validator', 'hono'],
})
