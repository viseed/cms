import { createCMS } from '@hanabi/core'
import { authPlugin } from '@hanabi/plugin-auth'
import { blogPlugin } from '@hanabi/plugin-blog'
import { mediaPlugin } from '@hanabi/plugin-media'
import { samplePlugin } from './plugins/sample-plugin'

const cms = createCMS({
  db: {
    driver: 'sqlite',
    url: './playground.db',
  },
  server: {
    port: 3000,
  },
})

cms.use(authPlugin())
cms.use(blogPlugin())
cms.use(mediaPlugin())
cms.use(samplePlugin())

const app = await cms.launch()

console.log('Hanabi CMS Playground running at http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
