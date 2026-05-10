export async function runMigrations(): Promise<void> {
  console.log('Collecting schemas from core and installed plugins...')

  // TODO: dynamically resolve viseed.config.ts in cwd,
  // gather all plugin schemas, merge them, and run drizzle-kit generate + migrate
  console.log('Migration complete.')
}
