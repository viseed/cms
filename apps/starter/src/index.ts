import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'
import { pagesPlugin } from '@hana/plugin-pages'
import { newsTheme } from '@hana/theme-news'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './data.db',
  },
  themes: [newsTheme()],
  defaultTheme: 'news',
})

cms.use(authPlugin())
cms.use(blogPlugin())
cms.use(pagesPlugin())

const app = await cms.launch()

console.log('Hana CMS running at http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
