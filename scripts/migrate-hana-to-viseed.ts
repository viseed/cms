/**
 * One-time script: rename hana_ tables/constraints/indexes → viseed_
 * Run with: bun run scripts/migrate-hana-to-viseed.ts
 *
 * Safe: uses a single transaction, rolls back on any error.
 */
import { SQL } from 'bun'

const rawUrl = process.env.DATABASE_URL ?? 'postgresql://postgres:admin@localhost:5432/hana'
// Bun SQL nhận ssl options riêng, không qua URL
const url = new URL(rawUrl)
url.searchParams.delete('sslrootcert')
url.searchParams.delete('sslcert')
url.searchParams.delete('sslkey')

const db = new SQL(url.toString())

async function tableExists(name: string): Promise<boolean> {
  const [row] = await db`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${name}
  `
  return Boolean(row)
}

async function constraintExists(table: string, constraint: string): Promise<boolean> {
  const [row] = await db`
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = ${table} AND constraint_name = ${constraint}
  `
  return Boolean(row)
}

async function indexExists(name: string): Promise<boolean> {
  const [row] = await db`
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = ${name}
  `
  return Boolean(row)
}

const tableRenames: [string, string][] = [
  ['hana_installed_plugins', 'viseed_installed_plugins'],
  ['hana_installed_themes', 'viseed_installed_themes'],
  ['hana_sessions', 'viseed_sessions'],
  ['hana_site_domains', 'viseed_site_domains'],
  ['hana_sites', 'viseed_sites'],
  ['hana_theme_state', 'viseed_theme_state'],
  ['hana_user_site_roles', 'viseed_user_site_roles'],
  ['hana_users', 'viseed_users'],
]

// Constraints to rename: [newTable, oldConstraint, newConstraint]
const constraintRenames: [string, string, string][] = [
  ['viseed_users', 'hana_users_email_unique', 'viseed_users_email_unique'],
  [
    'viseed_installed_plugins',
    'hana_installed_plugins_site_id_hana_sites_id_fk',
    'viseed_installed_plugins_site_id_viseed_sites_id_fk',
  ],
  [
    'viseed_installed_themes',
    'hana_installed_themes_site_id_hana_sites_id_fk',
    'viseed_installed_themes_site_id_viseed_sites_id_fk',
  ],
  [
    'viseed_sessions',
    'hana_sessions_site_id_hana_sites_id_fk',
    'viseed_sessions_site_id_viseed_sites_id_fk',
  ],
  [
    'viseed_sessions',
    'hana_sessions_user_id_hana_users_id_fk',
    'viseed_sessions_user_id_viseed_users_id_fk',
  ],
  [
    'viseed_site_domains',
    'hana_site_domains_site_id_hana_sites_id_fk',
    'viseed_site_domains_site_id_viseed_sites_id_fk',
  ],
  [
    'viseed_theme_state',
    'hana_theme_state_site_id_hana_sites_id_fk',
    'viseed_theme_state_site_id_viseed_sites_id_fk',
  ],
  [
    'viseed_user_site_roles',
    'hana_user_site_roles_user_id_hana_users_id_fk',
    'viseed_user_site_roles_user_id_viseed_users_id_fk',
  ],
  [
    'viseed_user_site_roles',
    'hana_user_site_roles_site_id_hana_sites_id_fk',
    'viseed_user_site_roles_site_id_viseed_sites_id_fk',
  ],
]

const indexRenames: [string, string][] = [
  ['hana_installed_plugins_site_name_unique', 'viseed_installed_plugins_site_name_unique'],
  ['hana_installed_themes_site_name_unique', 'viseed_installed_themes_site_name_unique'],
  ['hana_sessions_site_token_unique', 'viseed_sessions_site_token_unique'],
  ['hana_site_domains_domain_unique', 'viseed_site_domains_domain_unique'],
  ['hana_site_domains_site_domain_unique', 'viseed_site_domains_site_domain_unique'],
  ['hana_sites_slug_unique', 'viseed_sites_slug_unique'],
  ['hana_theme_state_site_unique', 'viseed_theme_state_site_unique'],
  ['hana_theme_state_site_theme_unique', 'viseed_theme_state_site_theme_unique'],
  ['hana_user_site_roles_user_site_unique', 'viseed_user_site_roles_user_site_unique'],
]

console.log('Checking current state...')

const firstOld = await tableExists('hana_users')
const firstNew = await tableExists('viseed_users')

if (!firstOld && firstNew) {
  console.log('✓ Tables already renamed — nothing to do.')
  await db.end()
  process.exit(0)
}

if (!firstOld && !firstNew) {
  console.error('✗ Neither hana_users nor viseed_users found. Wrong database?')
  await db.end()
  process.exit(1)
}

console.log('Starting rename inside a transaction...\n')

await db.transaction(async (tx) => {
  // 1. Rename tables
  for (const [oldName, newName] of tableRenames) {
    if (await tableExists(oldName)) {
      await tx.unsafe(`ALTER TABLE "${oldName}" RENAME TO "${newName}"`)
      console.log(`  ✓ table  ${oldName} → ${newName}`)
    } else {
      console.log(`  - table  ${oldName} (already renamed or missing, skipping)`)
    }
  }

  // 2. Rename constraints (after tables are renamed, use new table names)
  for (const [table, oldConstraint, newConstraint] of constraintRenames) {
    if (await constraintExists(table, oldConstraint)) {
      await tx.unsafe(
        `ALTER TABLE "${table}" RENAME CONSTRAINT "${oldConstraint}" TO "${newConstraint}"`,
      )
      console.log(`  ✓ constraint  ${oldConstraint} → ${newConstraint}`)
    } else {
      console.log(`  - constraint  ${oldConstraint} (already renamed or missing, skipping)`)
    }
  }

  // 3. Rename indexes
  for (const [oldIndex, newIndex] of indexRenames) {
    if (await indexExists(oldIndex)) {
      await tx.unsafe(`ALTER INDEX "${oldIndex}" RENAME TO "${newIndex}"`)
      console.log(`  ✓ index  ${oldIndex} → ${newIndex}`)
    } else {
      console.log(`  - index  ${oldIndex} (already renamed or missing, skipping)`)
    }
  }
})

console.log('\n✓ Migration complete. All hana_ tables renamed to viseed_.')
await db.end()
