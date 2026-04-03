import type { CMSPlugin } from '@hana/types'
import { setupBlogRoutes } from './routes'
import { blogSchema } from './schema'

export function blogPlugin(): CMSPlugin {
  return {
    name: 'blog',
    version: '0.1.0',
    schema: blogSchema,
    routes: (app, helpers) => setupBlogRoutes(app, helpers),
  }
}

export { blogSchema, categories, posts } from './schema'
