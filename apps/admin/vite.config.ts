import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

function hanaImportMapPlugin(): Plugin {
  let isDev = false
  let vueChunkFileName = ''
  let vueRouterChunkFileName = ''
  let cacheDir = ''

  return {
    name: 'hana-import-map',
    enforce: 'post',

    configResolved(config) {
      isDev = config.command === 'serve'
      cacheDir = config.cacheDir
    },

    generateBundle(_options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue
        if (fileName.includes('vendor-vue-router')) {
          vueRouterChunkFileName = fileName
        } else if (fileName.includes('vendor-vue')) {
          vueChunkFileName = fileName
        }
      }
    },

    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const imports: Record<string, string> = {}

        if (isDev) {
          let browserHash = ''
          try {
            const metadataPath = join(cacheDir, 'deps', '_metadata.json')
            const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))
            browserHash = metadata.browserHash ?? ''
          } catch {
            // metadata not yet available on first run — hash will be empty
          }
          const hash = browserHash ? `?v=${browserHash}` : ''
          imports.vue = `/admin/node_modules/.vite/deps/vue.js${hash}`
          imports['vue-router'] = `/admin/node_modules/.vite/deps/vue-router.js${hash}`
        } else {
          imports.vue = vueChunkFileName
            ? `/admin/assets/${vueChunkFileName}`
            : '/admin/assets/vendor-vue.js'
          imports['vue-router'] = vueRouterChunkFileName
            ? `/admin/assets/${vueRouterChunkFileName}`
            : '/admin/assets/vendor-vue-router.js'
        }

        const importMap = `<script type="importmap">
{
  "imports": ${JSON.stringify(imports, null, 4)}
}
</script>`

        return html.replace('<head>', `<head>\n    ${importMap}`)
      },
    },
  }
}

export default defineConfig(() => ({
  base: '/admin/',
  plugins: [vue(), hanaImportMapPlugin()],
  build: {
    outDir: '../../packages/core/dist/admin',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue'],
          'vendor-vue-router': ['vue-router'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
