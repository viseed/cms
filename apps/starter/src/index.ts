import { createCMS } from '@hanabi/core'
import { authPlugin } from '@hanabi/plugin-auth'
import { blogPlugin } from '@hanabi/plugin-blog'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './data.db',
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())

const app = await cms.launch()

console.log('Hanabi CMS running at http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
