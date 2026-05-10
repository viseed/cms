import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSTheme } from '@viseed/types'
import { blogCompanionPlugin } from './companion-plugin'

export { blogCompanionPlugin }

const __dirname = dirname(fileURLToPath(import.meta.url))

export function blogTheme(): CMSTheme {
  return {
    name: 'blog',
    version: '0.1.0',
    templateRoot: resolve(__dirname, '../templates'),
    staticRoot: resolve(__dirname, '../static'),
    assets: {
      css: ['css/style.css'],
    },
    companionPlugin: blogCompanionPlugin(),
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
            { key: 'siteTitle', label: 'Site Title', type: 'text', default: 'Viseed Blog' },
            {
              key: 'siteDescription',
              label: 'Site Description',
              type: 'textarea',
              default: 'A modern blog powered by Viseed CMS',
            },
            { key: 'brandColor', label: 'Brand Color', type: 'color', default: '#1a56db' },
          ],
        },
        {
          key: 'hero',
          title: 'Hero Section',
          fields: [{ key: 'showHero', label: 'Show Hero Section', type: 'boolean', default: true }],
        },
        {
          key: 'sidebar',
          title: 'Sidebar',
          fields: [{ key: 'showSidebar', label: 'Show Sidebar', type: 'boolean', default: true }],
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
