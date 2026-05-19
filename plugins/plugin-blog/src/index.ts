import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type DatabaseInstance, renderBody, renderBodyWithToc } from '@viseed/core'
import { type CMSPlugin, HOOK_KEY, type ThemeRenderRequestContext } from '@viseed/types'
import { and, desc, eq } from 'drizzle-orm'
import { setupBlogRoutes } from './routes'
import { blogSchema, categories, posts } from './schema'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db: DatabaseInstance | null = null

export function blogPlugin(): CMSPlugin {
  return {
    name: 'blog',
    version: '0.1.0',
    schema: blogSchema,
    admin: {
      menuItems: [
        {
          id: 'blog-posts',
          label: 'Posts',
          icon: '✎',
          path: '/blog/posts',
          siteScoped: true,
          requiredPermissions: ['site.content.read'],
          order: 20,
          componentExport: 'PostsView',
        },
        {
          id: 'blog-categories',
          label: 'Categories',
          icon: '▤',
          path: '/blog/categories',
          siteScoped: true,
          requiredPermissions: ['site.content.read'],
          order: 21,
          componentExport: 'CategoriesView',
        },
      ],
      bundlePath: resolve(__dirname, '../dist/admin/index.js'),
    },
    widgets: [
      {
        id: 'blog/latest-posts',
        label: 'Latest Posts',
        icon: '✎',
        description: 'Display a list of the most recent published posts',
        pluginName: 'blog',
        configComponent: 'LatestPostsConfigForm',
        previewComponent: 'LatestPosts',
        publicComponent: 'LatestPosts',
        defaultConfig: { count: 5, title: 'Latest Posts' },
      },
    ],
    public: {
      bundlePath: resolve(__dirname, '../dist/public/index.js'),
    },
    hooks: {
      [HOOK_KEY.CMS_INIT]: (cms) => {
        db = cms.getDatabase() as DatabaseInstance
      },
      [HOOK_KEY.THEME_BEFORE_RENDER]: async (
        layoutKey: string,
        data: Record<string, unknown>,
        reqCtx: ThemeRenderRequestContext,
      ) => {
        if (!db) return data

        if (layoutKey === 'home') {
          const latestPosts = await db
            .select()
            .from(posts)
            .where(eq(posts.status, 'published'))
            .orderBy(desc(posts.publishedAt))
            .limit(10)

          const postsWithHtml = latestPosts.map((p) => ({
            ...p,
            bodyHtml: renderBody(p.body),
          }))

          const allCategories = await db.select().from(categories)

          return { ...data, posts: postsWithHtml, categories: allCategories }
        }

        if (layoutKey === 'post') {
          const slug = reqCtx.params.slug
          if (slug) {
            const [post] = await db
              .select()
              .from(posts)
              .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))

            if (post) {
              const { bodyHtml, tocHtml } = renderBodyWithToc(post.body, {
                withToc: post.tocEnabled,
              })

              let category = null
              if (post.categoryId) {
                const [cat] = await db
                  .select()
                  .from(categories)
                  .where(eq(categories.id, post.categoryId))
                category = cat ?? null
              }

              return { ...data, post: { ...post, bodyHtml, tocHtml }, category }
            }
            return { ...data, post: null, category: null }
          }
        }

        if (layoutKey === 'category') {
          const slug = reqCtx.params.slug
          if (slug) {
            const [category] = await db.select().from(categories).where(eq(categories.slug, slug))

            if (category) {
              const categoryPosts = await db
                .select()
                .from(posts)
                .where(and(eq(posts.categoryId, category.id), eq(posts.status, 'published')))
                .orderBy(desc(posts.publishedAt))

              const postsWithHtml = categoryPosts.map((p) => ({
                ...p,
                bodyHtml: renderBody(p.body),
              }))

              return { ...data, category, posts: postsWithHtml }
            }

            return { ...data, category: null, posts: [] }
          }
        }

        return data
      },
    },
    routes: (app, helpers) => setupBlogRoutes(app, helpers, () => db),
  }
}

export { blogSchema, categories, posts } from './schema'
