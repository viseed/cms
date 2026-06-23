import { describe, expect, test } from 'bun:test'
import { createDatabase } from './database'

const DATABASE_URL = process.env.DATABASE_URL

describe('createDatabase PostgreSQL', () => {
  test.skipIf(!DATABASE_URL)(
    'creates a database instance with valid connection string',
    async () => {
      const db = await createDatabase({ driver: 'postgres', url: DATABASE_URL as string })
      expect(db).toBeDefined()
    },
  )
})
