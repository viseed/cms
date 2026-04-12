import { describe, expect, test } from 'bun:test'
import { createCMS } from '@hana/core'
import { blogPlugin } from './index'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/hana_test'

function createMultisiteCMS() {
  return createCMS({
    db: { driver: 'postgres', url: DATABASE_URL },
    admin: { enabled: false },
    plugins: [blogPlugin()],
  })
}

describe('blog plugin site isolation', () => {
  test('blog routes resolve site context and include siteId in response', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/posts')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })

  test('blog post creation includes siteId from request context', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Test Post', slug: 'test-post', body: 'Hello' }),
    })
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.siteId).toBe('default')
  })

  test('blog post lookup by slug includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/posts/my-slug')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
    expect(body.slug).toBe('my-slug')
  })

  test('blog post update includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/posts/some-id', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })

  test('blog post delete includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/posts/some-id', {
      method: 'DELETE',
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })

  test('categories listing includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/categories')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })

  test('category creation includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/blog/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Tech', slug: 'tech' }),
    })
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.siteId).toBe('default')
  })
})
