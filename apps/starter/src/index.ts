import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'
import { menuPlugin } from '@hana/plugin-menu'
import { pagesPlugin } from '@hana/plugin-pages'
import { blogTheme } from '@hana/theme-blog'
import { insuranceTheme } from '@hana/theme-insurance'

const cms = createCMS({
  db: {
    driver: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:admin@localhost:5432/hana',
  },
  themes: [blogTheme(), insuranceTheme()],
  defaultTheme: 'blog',
})

cms.use(authPlugin())
cms.use(blogPlugin())
cms.use(menuPlugin())
cms.use(pagesPlugin())

const app = await cms.launch()

const port = Number(process.env.PORT) || 3000

console.log(`Hana CMS running at http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
