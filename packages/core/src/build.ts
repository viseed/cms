import vue from '@vitejs/plugin-vue'
import { build, type InlineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

export type PluginBundleTarget = 'admin' | 'public'

export interface PluginBundleOptions {
  /** Override the entry file path. Defaults: admin → src/admin/index.ts, public → src/public/index.ts */
  entry?: string
  /** Override the output directory. Defaults: admin → dist/admin, public → dist/public */
  outDir?: string
  /** Additional externals merged with the target defaults (admin adds vue-router on top of vue). */
  external?: string[]
  /** Spread onto the top-level Vite InlineConfig after all other options are applied. */
  viteConfig?: InlineConfig
}

const DEFAULTS = {
  admin: {
    entry: 'src/admin/index.ts',
    outDir: 'dist/admin',
    external: ['vue', 'vue-router'] as string[],
  },
  public: {
    entry: 'src/public/index.ts',
    outDir: 'dist/public',
    external: ['vue'] as string[],
  },
} satisfies Record<PluginBundleTarget, { entry: string; outDir: string; external: string[] }>

export async function buildPluginBundle(
  target: PluginBundleTarget,
  options: PluginBundleOptions = {},
): Promise<void> {
  const preset = DEFAULTS[target]
  const { entry, outDir, external = [], viteConfig } = options

  await build({
    plugins: [vue(), cssInjectedByJsPlugin()],
    build: {
      lib: {
        entry: entry ?? preset.entry,
        formats: ['es'],
        fileName: 'index',
      },
      outDir: outDir ?? preset.outDir,
      emptyOutDir: true,
      rollupOptions: {
        external: [...preset.external, ...external],
      },
    },
    ...viteConfig,
  })
}

export const buildPluginAdmin = (options?: PluginBundleOptions): Promise<void> =>
  buildPluginBundle('admin', options)

export const buildPluginPublic = (options?: PluginBundleOptions): Promise<void> =>
  buildPluginBundle('public', options)
