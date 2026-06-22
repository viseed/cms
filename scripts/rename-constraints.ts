/**
 * Second pass: rename remaining hana_ constraints on viseed_ tables.
 * Run after migrate-hana-to-viseed.ts.
 */
import { SQL } from 'bun'

const db = new SQL(process.env.DATABASE_URL ?? 'postgresql://postgres:admin@localhost:5432/hana')

const renames: [string, string, string][] = [
  // [table, oldConstraint, newConstraint]
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

for (const [table, oldName, newName] of renames) {
  const [row] = await db`
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = ${table} AND constraint_name = ${oldName}
  `
  if (row) {
    await db.unsafe(`ALTER TABLE "${table}" RENAME CONSTRAINT "${oldName}" TO "${newName}"`)
    console.log(`✓  ${oldName}\n   → ${newName}`)
  } else {
    console.log(`-  ${oldName} (already renamed or missing)`)
  }
}

console.log('\n✓ Done.')
await db.end()
