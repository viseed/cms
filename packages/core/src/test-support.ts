import { resolve } from 'node:path'
import { SQL } from 'bun'

/**
 * Test-only helpers. NOT part of the public API and NOT collected as a test file
 * (no `.test.ts` suffix).
 *
 * Integration tests MUST provision their database through {@link ensureTestDatabase}
 * so they can never touch the real dev DB. The target is resolved from
 * `TEST_DATABASE_URL` (NOT `DATABASE_URL`, which `.env` points at the real DB),
 * defaulting to a local `viseed_test`, and is hard-guarded to contain "test".
 */
const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres:admin@localhost:5432/viseed_test'

let provisioned: string | null = null

function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL
  const dbName = new URL(url).pathname.replace(/^\//, '')
  if (!dbName.includes('test')) {
    throw new Error(
      `Integration tests refuse to run against database "${dbName}" — the name must contain "test". ` +
        'Set TEST_DATABASE_URL to a dedicated test database.',
    )
  }
  return url
}

/**
 * Ensure the dedicated test database exists and has the current schema, then
 * return its connection URL. Idempotent and cached per process.
 */
export async function ensureTestDatabase(): Promise<string> {
  if (provisioned) {
    return provisioned
  }

  const url = resolveTestDatabaseUrl()
  const dbName = new URL(url).pathname.replace(/^\//, '')

  // 1. Create the database if it does not exist (via the maintenance DB).
  const maintenanceUrl = new URL(url)
  maintenanceUrl.pathname = '/postgres'
  const admin = new SQL(maintenanceUrl.toString())
  try {
    const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
    if (exists.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${dbName}"`)
    }
  } finally {
    await admin.end()
  }

  // 2. Push the current Drizzle schema (idempotent) using the test-only config.
  const repoRoot = resolve(import.meta.dir, '../../..')
  const push = Bun.spawnSync({
    cmd: ['bun', 'x', 'drizzle-kit', 'push', '--config', 'drizzle.config.test.ts', '--force'],
    cwd: repoRoot,
    env: { ...process.env, TEST_DATABASE_URL: url },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (push.exitCode !== 0) {
    const stderr = push.stderr.toString()
    const stdout = push.stdout.toString()
    throw new Error(`drizzle-kit push to test database failed:\n${stderr || stdout}`)
  }

  // 3. Start every test run from a clean slate (mirrors an ephemeral CI database),
  // so suites stay deterministic and never accumulate data across local runs.
  const target = new SQL(url)
  try {
    const tables = await target<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'viseed_%'
    `
    if (tables.length > 0) {
      const tableList = tables.map((row) => `"${row.tablename}"`).join(', ')
      await target.unsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)
    }
  } finally {
    await target.end()
  }

  provisioned = url
  return url
}
