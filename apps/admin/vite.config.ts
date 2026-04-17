import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Vendor entry points use predictable filenames (no hash) so the import map
// can reference them at fixed URLs. Cache busting is handled by query-param
// versioning at the HTTP layer if needed; these files change only when Vue
// version changes, which is rare and requires a full rebuild anyway.
const VENDOR_VUE_URL = '/admin/assets/vendor-vue.js'
const VENDOR_VUE_ROUTER_URL = '/admin/assets/vendor-vue-router.js'

function hanaImportMapPlugin(): Plugin {
  let isDev = false
  let cacheDir = ''

  return {
    name: 'hana-import-map',
    enforce: 'post',

    configResolved(config) {
      isDev = config.command === 'serve'
      cacheDir = config.cacheDir
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
          // Vendor entry points are built with fixed (non-hashed) filenames
          // so plugin bundles can always resolve the correct Vue/Vue Router.
          imports.vue = VENDOR_VUE_URL
          imports['vue-router'] = VENDOR_VUE_ROUTER_URL
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
      input: {
        index: join(__dirname, 'index.html'),
        'vendor-vue': join(__dirname, 'src/vendor/vue.ts'),
        'vendor-vue-router': join(__dirname, 'src/vendor/vue-router.ts'),
      },
      // Preserve all exports from the vendor entry points so plugin bundles
      // can import any Vue/Vue Router API even if the admin SPA doesn't use it.
      preserveEntrySignatures: 'exports-only',
      output: {
        // Vendor entries use fixed filenames (no hash) for predictable import map URLs.
        // All other entries and chunks keep content-hashed filenames.
        entryFileNames: (chunkInfo) =>
          ['vendor-vue', 'vendor-vue-router'].includes(chunkInfo.name)
            ? 'assets/[name].js'
            : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
}))
