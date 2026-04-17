import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CMSTheme } from '@hana/types'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function insuranceTheme(): CMSTheme {
  return {
    name: 'insurance',
    version: '0.1.0',
    templateRoot: resolve(__dirname, '../templates'),
    staticRoot: resolve(__dirname, '../static'),
    layouts: {
      home: { template: 'home.eta' },
      post: { template: 'post.eta' },
      category: { template: 'category.eta' },
      page: { template: 'page.eta' },
      '404': { template: '404.eta' },
    },
    assets: {
      css: ['css/style.css'],
    },
    menuZones: ['primary', 'footer'],
    settingsSchema: {
      version: '1.0.0',
      sections: [
        {
          key: 'general',
          title: 'General',
          fields: [
            { key: 'siteName', label: 'Site Name', type: 'text', default: 'Insurance' },
            {
              key: 'logoUrl',
              label: 'Logo URL',
              type: 'image',
              description: 'URL to your logo image',
            },
          ],
        },
        {
          key: 'header',
          title: 'Header Contact Bar',
          description: 'Information displayed in the top bar above the navigation',
          fields: [
            {
              key: 'phoneIcon',
              label: 'Phone Icon',
              type: 'image',
              description: 'Icon for the phone number',
            },
            {
              key: 'contactPhone',
              label: 'Phone Number',
              type: 'text',
              default: '(028) 3810 0888',
              placeholder: '(028) 3810 0888',
            },
            {
              key: 'contactEmail',
              label: 'Email',
              type: 'text',
              default: 'customer.services@insurance.com',
              placeholder: 'customer@example.com',
            },
            {
              key: 'hotlineText',
              label: 'Hotline Label',
              type: 'text',
              default: 'Hotline',
              placeholder: 'Hotline',
            },
            {
              key: 'topBarLinks',
              label: 'Top Bar Links',
              type: 'link_list',
              default: [],
              description: 'Quick links shown in the top bar (e.g. Buy online, Agency network)',
            },
          ],
        },
        {
          key: 'banner',
          title: 'Hero Banner',
          description: 'The main banner displayed below the navigation',
          fields: [
            {
              key: 'slides',
              label: 'Banner Slides',
              type: 'item_list',
              imageKey: 'imageUrl',
              description: 'Drag to reorder. Each slide shows as a full-width carousel banner.',
              default: [],
              itemSchema: [
                { key: 'imageUrl', label: 'Image URL', type: 'image', required: true, placeholder: 'https://... or /uploads/...' },
                { key: 'title', label: 'Title', type: 'text', placeholder: 'Welcome to Insurance' },
                { key: 'subtitle', label: 'Subtitle', type: 'text', placeholder: 'Trusted protection for your family' },
                { key: 'ctaText', label: 'CTA Button Text', type: 'text', placeholder: 'Learn More' },
                { key: 'ctaUrl', label: 'CTA Button URL', type: 'text', placeholder: '/products' },
                { key: 'active', label: 'Active (show in carousel)', type: 'boolean' },
              ],
            },
            { key: 'title', label: 'Fallback Title', type: 'text', default: 'Welcome', description: 'Used if no slides are configured' },
            {
              key: 'subtitle',
              label: 'Fallback Subtitle',
              type: 'text',
              default: 'Trusted insurance for your family',
            },
            { key: 'imageUrl', label: 'Fallback Image URL', type: 'image' },
            { key: 'ctaText', label: 'Fallback CTA Text', type: 'text', default: 'Learn More' },
            { key: 'ctaUrl', label: 'Fallback CTA URL', type: 'text', default: '/products' },
          ],
        },
        {
          key: 'products',
          title: 'Products Carousel',
          fields: [
            {
              key: 'items',
              label: 'Carousel Items',
              type: 'item_list',
              imageKey: 'imageUrl',
              description: 'Drag to reorder. Each item links to a blog post.',
              default: [],
              itemSchema: [
                { key: 'imageUrl', label: 'Image URL', type: 'image', placeholder: 'https://... or /uploads/...' },
                { key: 'title', label: 'Product Name', type: 'text', placeholder: 'e.g. Life Insurance' },
                { key: 'excerpt', label: 'Short Description', type: 'text', placeholder: 'Brief description...' },
                { key: 'postUrl', label: 'Link URL', type: 'text', placeholder: '/post/my-post or /products/life' },
                { key: 'active', label: 'Active (show in carousel)', type: 'boolean' },
              ],
            },
            {
              key: 'sectionTitle',
              label: 'Section Title',
              type: 'text',
              default: 'Insurance solutions for your needs',
            },
            {
              key: 'sectionSubtitle',
              label: 'Section Subtitle',
              type: 'text',
              default: 'Your trusted companion, we provides',
            },
            {
              key: 'viewAllText',
              label: '"View All" Button Text',
              type: 'text',
              default: 'View all',
            },
            { key: 'viewAllUrl', label: '"View All" Button URL', type: 'text', default: '/products' },
          ],
        },
        {
          key: 'footer',
          title: 'Footer',
          fields: [
            { key: 'aboutText', label: 'About Text', type: 'textarea', rows: 3 },
            {
              key: 'address',
              label: 'Address',
              type: 'text',
              default: '162-164 Hai Ba Trung Street, Vo Thi Sau Ward, District 3, Ho Chi Minh City',
            },
            { key: 'footerPhone', label: 'Footer Phone', type: 'text', default: '(028) 3810 0888' },
            { key: 'footerEmail', label: 'Footer Email', type: 'text', default: 'customer@insurance.com' },
            {
              key: 'copyrightText',
              label: 'Copyright Text',
              type: 'text',
              default: 'All rights reserved.',
            },
            {
              key: 'socialLinks',
              label: 'Social Media Links',
              type: 'link_list',
              default: [],
            },
            {
              key: 'col1Title',
              label: 'Column 1 Title',
              type: 'text',
              default: 'Insurance Solutions',
            },
            { key: 'col1Links', label: 'Column 1 Links', type: 'link_list', default: [] },
            {
              key: 'col2Title',
              label: 'Column 2 Title',
              type: 'text',
              default: 'Customer Service',
            },
            { key: 'col2Links', label: 'Column 2 Links', type: 'link_list', default: [] },
            {
              key: 'col3Title',
              label: 'Column 3 Title',
              type: 'text',
              default: 'News',
            },
            { key: 'col3Links', label: 'Column 3 Links', type: 'link_list', default: [] },
          ],
        },
      ],
    },
  }
}
