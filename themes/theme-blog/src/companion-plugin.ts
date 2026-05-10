import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@viseed/types'

export function blogCompanionPlugin(): CMSPlugin {
  return {
    name: 'blog-companion',
    version: '0.1.0',
    hooks: {
      [HOOK_KEY.THEME_BEFORE_RENDER]: async (
        layoutKey: string,
        data: Record<string, unknown>,
        _reqCtx: ThemeRenderRequestContext,
      ) => {
        if (layoutKey === 'post') {
          return {
            ...data,
            relatedPosts: [],
            showAuthorBio: true,
            theme: 'blog',
          }
        }

        return data
      },
    },
    routes: (app) => {
      app.get('/test/api', (c) => {
        return c.json({ message: 'blog-companion plugin is alive', theme: 'blog' })
      })
    },
  }
}
