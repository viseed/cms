import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle config for the DEDICATED integration-test database.
 *
 * Unlike `drizzle.config.ts`, this does NOT load `.env.drizzle`, so it can never
 * accidentally point at the real `viseed` dev database. Integration tests must
 * run against this DB (see `09-testing-strategy.mdc`).
 *
 * Override the URL with `TEST_DATABASE_URL` if your local Postgres differs.
 */
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:admin@localhost:5432/viseed_test'

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './packages/schema/src/tables/*.ts',
    './plugins/*/src/schema.ts',
    './themes/*/src/schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: TEST_DATABASE_URL,
  },
})
