import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './data.db',
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())

const app = await cms.launch()

console.log('Hana CMS running at http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
