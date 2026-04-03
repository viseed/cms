import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { mediaPlugin } from './index'
import { LocalStorageAdapter } from './storage'
import { createCMS } from '@hana/core'

const SQLITE_MEMORY_DB = ':memory:'

function createMultisiteCMS() {
  return createCMS({
    db: { driver: 'sqlite', url: SQLITE_MEMORY_DB },
    admin: { enabled: false },
    plugins: [mediaPlugin()],
  })
}

describe('media plugin site isolation', () => {
  test('media listing resolves site context and includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/media')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })

  test('media delete includes siteId', async () => {
    const cms = createMultisiteCMS()
    const app = await cms.launch()

    const response = await app.request('http://localhost/api/media/some-id', {
      method: 'DELETE',
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.siteId).toBe('default')
  })
})

describe('LocalStorageAdapter site namespacing', () => {
  test('save creates site-specific subdirectory', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'hana-media-test-'))
    try {
      const adapter = new LocalStorageAdapter(tempDir)
      const data = new TextEncoder().encode('test content').buffer as ArrayBuffer

      const path = await adapter.save('test.txt', data, 'site-alpha')
      expect(path).toBe(join(tempDir, 'site-alpha', 'test.txt'))

      const entries = await readdir(join(tempDir, 'site-alpha'))
      expect(entries).toContain('test.txt')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test('different sites write to different directories', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'hana-media-test-'))
    try {
      const adapter = new LocalStorageAdapter(tempDir)
      const data = new TextEncoder().encode('content').buffer as ArrayBuffer

      await adapter.save('file.txt', data, 'site-a')
      await adapter.save('file.txt', data, 'site-b')

      const entriesA = await readdir(join(tempDir, 'site-a'))
      const entriesB = await readdir(join(tempDir, 'site-b'))
      expect(entriesA).toContain('file.txt')
      expect(entriesB).toContain('file.txt')
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  test('getUrl includes siteId in path', () => {
    const adapter = new LocalStorageAdapter('./uploads')
    const url = adapter.getUrl('/uploads/site-alpha/image.png', 'site-alpha')
    expect(url).toBe('/uploads/site-alpha/image.png')
  })
})
