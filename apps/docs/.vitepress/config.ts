import { defineConfig } from 'vitepress'

export default defineConfig({
  // Served from https://viseed.github.io/cms/ on GitHub Pages.
  // Local dev/preview stays at root for convenience.
  base: process.env.GITHUB_ACTIONS ? '/cms/' : '/',
  title: 'Viseed CMS',
  description: 'A lightweight, extensible CMS framework for Bun',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Plugins', link: '/plugins/overview' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Configuration', link: '/guide/configuration' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Plugin System', link: '/guide/plugins' },
            { text: 'Themes', link: '/guide/themes' },
            { text: 'Database', link: '/guide/database' },
            { text: 'Media', link: '/guide/media' },
          ],
        },
        {
          text: 'Tooling',
          items: [
            { text: 'CLI Reference', link: '/guide/cli' },
            { text: 'Deployment', link: '/guide/deployment' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'Plugins',
          items: [
            { text: 'Overview', link: '/plugins/overview' },
            { text: 'Widgets', link: '/plugins/widgets' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/viseed/cms' }],
  },
})
