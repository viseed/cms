import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSTheme } from '@hana/types'
import { newsCompanionPlugin } from './companion-plugin'

export { newsCompanionPlugin }

const __dirname = dirname(fileURLToPath(import.meta.url))

export function newsTheme(): CMSTheme {
  return {
    name: 'news',
    version: '0.1.0',
    templateRoot: resolve(__dirname, '../templates'),
    staticRoot: resolve(__dirname, '../static'),
    companionPlugin: newsCompanionPlugin(),
    layouts: {
      home: { template: 'home.eta' },
      post: { template: 'post.eta' },
      category: { template: 'category.eta' },
      page: { template: 'page.eta' },
      404: { template: '404.eta' },
    },
    menuZones: ['primary', 'footer'],
    settingsSchema: {
      version: '1.0.0',
      sections: [
        {
          key: 'general',
          title: 'General',
          fields: [
            { key: 'siteTitle', label: 'Site Title', type: 'text', default: 'Hana News' },
            {
              key: 'siteDescription',
              label: 'Site Description',
              type: 'textarea',
              default: 'A modern news site powered by Hana CMS',
            },
            { key: 'brandColor', label: 'Brand Color', type: 'color', default: '#1a56db' },
          ],
        },
        {
          key: 'hero',
          title: 'Hero Section',
          fields: [
            { key: 'showHero', label: 'Show Hero Section', type: 'boolean', default: true },
          ],
        },
        {
          key: 'sidebar',
          title: 'Sidebar',
          fields: [
            { key: 'showSidebar', label: 'Show Sidebar', type: 'boolean', default: true },
          ],
        },
        {
          key: 'footer',
          title: 'Footer',
          fields: [
            {
              key: 'socialLinks',
              label: 'Social Links',
              type: 'link_list',
              default: [],
            },
            {
              key: 'footerLinks',
              label: 'Footer Links',
              type: 'link_list',
              default: [],
            },
          ],
        },
      ],
    },
  }
}
