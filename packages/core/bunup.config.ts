import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp } from 'node:fs/promises'
import { defineConfig } from 'bunup'

// The admin SPA (apps/admin) builds into apps/admin/dist. Core ships and serves
// it from packages/core/dist/admin, so we copy it in after bunup. Turbo enforces
// admin#build before core#build, so the source dir exists during a full build.
const ADMIN_DIST_SOURCE = '../../apps/admin/dist'

export default defineConfig({
  sourcemap: 'linked',
  onSuccess: async () => {
    if (existsSync(ADMIN_DIST_SOURCE)) {
      await cp(ADMIN_DIST_SOURCE, 'dist/admin', { recursive: true })
    } else {
      console.warn(
        '[core build] apps/admin/dist not found — dist/admin will be missing. ' +
          'Run the admin build first (turbo handles this in a full build).',
      )
    }
  },
  plugins: [
    {
      name: 'tsc-map-generator',
      hooks: {
        onBuildDone: (ctx) => {
          if (ctx.options.watch) {
            exec('bun run dev:post')
          }
        },
      },
    },
  ],
})
