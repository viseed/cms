import { sites, users } from '@hana/schema'
import { describe, expect, test } from 'bun:test'
import { createDatabase } from './database'

describe('createDatabase driver group A', () => {
  test('sqlite file bootstrap exposes core tables', async () => {
    const path = ':memory:'
    const db = await createDatabase({ driver: 'sqlite', url: path })
    const rows = await db.select({ id: users.id }).from(users).all()
    expect(Array.isArray(rows)).toBe(true)
    const siteRows = await db.select({ id: sites.id }).from(sites).all()
    expect(siteRows.some((s) => s.id === 'default')).toBe(true)
  })

  test('turso libsql in-memory bootstrap matches sqlite foundation', async () => {
    const db = await createDatabase({
      driver: 'turso',
      url: 'file::memory:?cache=shared',
    })
    const siteRows = await db.select({ id: sites.id, slug: sites.slug }).from(sites).all()
    const def = siteRows.find((s) => s.id === 'default')
    expect(def?.slug).toBe('default')
  })

  test('turso remote URL without authToken throws', async () => {
    await expect(
      createDatabase({
        driver: 'turso',
        url: 'libsql://example.turso.io',
      }),
    ).rejects.toThrow(/authToken/)
  })

  test('sqlite driver rejects remote libsql URL (use driver turso)', async () => {
    await expect(
      createDatabase({
        driver: 'sqlite',
        url: 'libsql://example.turso.io',
      }),
    ).rejects.toThrow(/turso/)
  })

  test('postgres driver throws dialect message', async () => {
    await expect(
      createDatabase({
        driver: 'postgres',
        url: 'postgresql://localhost:5432/hana',
      }),
    ).rejects.toThrow(/pgTable/)
  })
})
