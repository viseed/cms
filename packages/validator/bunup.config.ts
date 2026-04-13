import { exec } from 'node:child_process'
import { defineConfig } from 'bunup'

export default defineConfig({
  sourcemap: 'linked',
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
