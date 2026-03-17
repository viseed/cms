import type { CMSPlugin } from '@hanabi/types'
import { blogSchema } from './schema'
import { setupBlogRoutes } from './routes'

export function blogPlugin(): CMSPlugin {
  return {
    name: 'blog',
    version: '0.1.0',
    schema: blogSchema,
    routes: setupBlogRoutes,
  }
}

export { blogSchema, posts, categories } from './schema'
