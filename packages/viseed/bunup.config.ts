import { cp } from 'node:fs/promises'
import { defineConfig } from 'bunup'

// Both configs share the same `dist` dir. `clean` is disabled here so the two
// builds don't wipe each other's output (and the copied admin assets); the
// package `build` script does a single `rimraf dist` before bunup runs.
export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: false,
    external: [/^@viseed\//, 'drizzle-orm', 'hono', 'eta', /^@tiptap\//],
    onSuccess: async () => {
      await cp('../core/dist/admin', 'dist/admin', { recursive: true })
    },
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    external: [/^@viseed\//, 'drizzle-orm', /^@drizzle-kit/],
  },
])
