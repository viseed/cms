export { mergeSchemas } from './schema-builder'
export { installedPlugins } from './tables/installed-plugins'
export { installedThemes } from './tables/installed-themes'
export { sessions } from './tables/sessions'
export { siteDomains } from './tables/site-domains'
export { sites } from './tables/sites'
export { themeState } from './tables/theme-state'
export { userSiteRoles } from './tables/user-site-roles'
export { users } from './tables/users'

import { installedPlugins } from './tables/installed-plugins'
import { installedThemes } from './tables/installed-themes'
import { sessions } from './tables/sessions'
import { siteDomains } from './tables/site-domains'
import { sites } from './tables/sites'
import { themeState } from './tables/theme-state'
import { userSiteRoles } from './tables/user-site-roles'
import { users } from './tables/users'

export const coreSchema = {
  sites,
  siteDomains,
  users,
  userSiteRoles,
  sessions,
  installedPlugins,
  installedThemes,
  themeState,
}
