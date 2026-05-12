import vue from '@vitejs/plugin-vue'
import { build } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

await build({
  plugins: [vue(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: 'src/public/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist/public',
    emptyOutDir: true,
    rollupOptions: {
      external: ['vue'],
    },
  },
})
