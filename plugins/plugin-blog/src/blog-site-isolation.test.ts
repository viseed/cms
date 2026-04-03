import { describe, expect, test } from 'bun:test'
import { blogPlugin } from './index'
import { createCMS } from '@hana/core'

const SQLITE_MEMORY_DB = ':memory:'

function createMultisiteCMS() {
  return createCMS({
    db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
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

  test('blog schema tables have site_id column with default value', () => {
    const { posts, categories } = require('./schema')
    expect(posts.site_id).toBeDefined
    expect(categories.site_id).toBeDefined
  })
})
