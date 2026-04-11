import { build } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

await build({
  plugins: [vue(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: 'src/admin/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/admin',
    emptyOutDir: true,
    rollupOptions: {
      external: ['vue', 'vue-router'],
    },
  },
})
