import { describe, expect, test } from 'bun:test'
import { createDatabase } from './database'

const DATABASE_URL = process.env.DATABASE_URL

describe('createDatabase PostgreSQL', () => {
  test('creates a database instance with valid connection string', async () => {
    if (!DATABASE_URL) {
      console.log('Skipped: DATABASE_URL not set')
      return
    }
    const db = await createDatabase({ driver: 'postgres', url: DATABASE_URL })
    expect(db).toBeDefined()
  })
})
