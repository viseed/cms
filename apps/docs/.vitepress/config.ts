import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Hanabi CMS',
  description: 'A lightweight, extensible CMS framework for Bun',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Plugins', link: '/plugins/overview' },
      { text: 'API', link: '/api/core' },
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
            { text: 'Database', link: '/guide/database' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: 'Plugins',
          items: [
            { text: 'Overview', link: '/plugins/overview' },
            { text: 'Auth', link: '/plugins/auth' },
            { text: 'Blog', link: '/plugins/blog' },
            { text: 'Media', link: '/plugins/media' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hanabi-cms/hanabi' },
    ],
  },
})
