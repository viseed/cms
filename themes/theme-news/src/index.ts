import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSTheme } from '@hana/types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function newsTheme(): CMSTheme {
  return {
    name: 'news',
    version: '0.1.0',
    templateRoot: resolve(__dirname, '../templates'),
    staticRoot: resolve(__dirname, '../static'),
    layouts: {
      home: { template: 'home.eta' },
      post: { template: 'post.eta' },
      category: { template: 'category.eta' },
      page: { template: 'page.eta' },
      404: { template: '404.eta' },
    },
    menuZones: ['primary', 'footer'],
    settingsSchema: {
      sections: [
        {
          key: 'general',
          label: 'General',
          fields: [
            { key: 'siteTitle', label: 'Site Title', type: 'text', defaultValue: 'Hana News' },
            { key: 'siteDescription', label: 'Site Description', type: 'textarea', defaultValue: 'A modern news site powered by Hana CMS' },
            { key: 'brandColor', label: 'Brand Color', type: 'color', defaultValue: '#1a56db' },
          ],
        },
        {
          key: 'hero',
          label: 'Hero Section',
          fields: [
            { key: 'showHero', label: 'Show Hero Section', type: 'boolean', defaultValue: true },
          ],
        },
        {
          key: 'sidebar',
          label: 'Sidebar',
          fields: [
            { key: 'showSidebar', label: 'Show Sidebar', type: 'boolean', defaultValue: true },
          ],
        },
        {
          key: 'footer',
          label: 'Footer',
          fields: [
            {
              key: 'socialLinks',
              label: 'Social Links',
              type: 'link_list',
              defaultValue: [],
            },
            {
              key: 'footerLinks',
              label: 'Footer Links',
              type: 'link_list',
              defaultValue: [],
            },
          ],
        },
      ],
    },
  }
}
