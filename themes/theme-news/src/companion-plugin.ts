import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@hana/types'

export function newsCompanionPlugin(): CMSPlugin {
  return {
    name: 'news-companion',
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
            theme: 'news',
          }
        }

        return data
      },
    },
    routes: (app) => {
      app.get('/test/api', (c) => {
        return c.json({ message: 'news-companion plugin is alive', theme: 'news' })
      })
    },
  }
}
