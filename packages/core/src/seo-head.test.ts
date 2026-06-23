import { describe, expect, test } from 'bun:test'
import type { LayoutContext } from '@viseed/types'
import { renderSeoHead } from './seo-head'

function makeContext(overrides: {
  data?: Record<string, unknown>
  settings?: Record<string, unknown>
  url?: string
}): LayoutContext {
  return {
    data: overrides.data ?? {},
    settings: overrides.settings ?? {},
    menus: {},
    request: { url: overrides.url ?? 'http://example.com/', params: {} },
    helpers: {} as LayoutContext['helpers'],
  }
}

describe('renderSeoHead', () => {
  test('falls back to site settings for the home page', () => {
    const html = renderSeoHead(makeContext({ settings: { 'general.siteName': 'My Site' } }))

    expect(html).toContain('<title>My Site</title>')
    expect(html).toContain('<meta property="og:type" content="website">')
  })

  test('defaults the site name to Viseed CMS when no setting is present', () => {
    const html = renderSeoHead(makeContext({}))
    expect(html).toContain('<title>Viseed CMS</title>')
  })

  test('renders an article title and canonical for a post', () => {
    const html = renderSeoHead(
      makeContext({
        settings: { 'general.siteName': 'My Site' },
        data: { post: { title: 'Hello', slug: 'hello' } },
      }),
    )

    expect(html).toContain('<title>Hello — My Site</title>')
    expect(html).toContain('<meta property="og:type" content="article">')
    expect(html).toContain('<link rel="canonical" href="http://example.com/post/hello">')
  })

  test('builds the page canonical from the slug', () => {
    const html = renderSeoHead(makeContext({ data: { page: { title: 'About', slug: 'about' } } }))
    expect(html).toContain('<link rel="canonical" href="http://example.com/about">')
  })

  test('renders a category title', () => {
    const html = renderSeoHead(
      makeContext({
        settings: { 'general.siteName': 'My Site' },
        data: { category: { name: 'Tech', slug: 'tech' } },
      }),
    )
    expect(html).toContain('<title>Tech — My Site</title>')
    expect(html).toContain('<link rel="canonical" href="http://example.com/category/tech">')
  })

  test('resolves a relative ogImage against the request origin', () => {
    const html = renderSeoHead(
      makeContext({
        data: { post: { title: 'P', slug: 'p', metaSeo: { ogImage: '/uploads/a.png' } } },
      }),
    )
    expect(html).toContain('<meta property="og:image" content="http://example.com/uploads/a.png">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  test('uses a summary twitter card when there is no image', () => {
    const html = renderSeoHead(makeContext({}))
    expect(html).toContain('<meta name="twitter:card" content="summary">')
  })

  test('escapes closing script tags inside JSON-LD and injects @context', () => {
    const html = renderSeoHead(
      makeContext({
        data: {
          post: {
            title: 'P',
            slug: 'p',
            schemaOrg: [{ '@type': 'Article', headline: '</script>' }],
          },
        },
      }),
    )

    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('https://schema.org')
    expect(html).not.toContain('</script><')
    expect(html).toContain('<\\/script>')
  })
})
