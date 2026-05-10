import { cp } from 'node:fs/promises'
import { defineConfig } from 'bunup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    external: [/^@viseed\//, 'drizzle-orm', 'hono', 'eta', /^@tiptap\//],
    onSuccess: async () => {
      await cp('../core/dist/admin', 'dist/admin', { recursive: true })
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    external: [/^@viseed\//, 'drizzle-orm', /^@drizzle-kit/],
  },
])
