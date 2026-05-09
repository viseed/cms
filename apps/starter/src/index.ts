import { createCMS } from '@hanano/core'
import { authPlugin } from 'hanano-plugin-auth'
import { blogPlugin } from 'hanano-plugin-blog'
import { menuPlugin } from 'hanano-plugin-menu'
import { pagesPlugin } from 'hanano-plugin-pages'
import { blogTheme } from 'hanano-theme-blog'
import { insuranceTheme } from 'hanano-theme-insurance'

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

const server = Bun.serve({
  port,
  fetch: app.fetch,
})

console.log(`Hana CMS running at http://localhost:${port}`)

let isShuttingDown = false

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[Signal: ${signal}] Graceful shutdown initiated...`)

  // Force-exit safety net — fires before Docker's stop_grace_period (30s) kills us
  const forceExitTimer = setTimeout(() => {
    console.error('[Shutdown] Timed out after 25s, forcing exit.')
    process.exit(1)
  }, 25_000)

  try {
    // Stop accepting new HTTP connections (existing in-flight requests finish naturally)
    server.stop()

    // Close database connections and release CMS resources
    await cms.shutdown()

    clearTimeout(forceExitTimer)
    console.log(`[Signal: ${signal}] Shutdown complete.`)
    process.exit(0)
  } catch (error) {
    clearTimeout(forceExitTimer)
    console.error('[Shutdown] Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(console.error)
})

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(console.error)
})
