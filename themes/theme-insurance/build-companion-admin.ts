import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

await build({
  plugins: [vue(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: 'src/companion-admin/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/companion-admin',
    emptyOutDir: true,
    rollupOptions: {
      external: ['vue', 'vue-router'],
    },
  },
})
