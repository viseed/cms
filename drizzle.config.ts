import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.drizzle' })

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './packages/schema/src/tables/*.ts',
    './plugins/*/src/schema.ts',
    './themes/*/src/schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:admin@localhost:5432/viseed',
  },
})
