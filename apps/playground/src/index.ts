import { createCMS } from '@hana/core'
import { authPlugin } from '@hana/plugin-auth'
import { blogPlugin } from '@hana/plugin-blog'
import { mediaPlugin } from '@hana/plugin-media'
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

console.log('Hana CMS Playground running at http://localhost:3000')

export default {
  port: 3000,
  fetch: app.fetch,
}
