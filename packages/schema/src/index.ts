export { mergeSchemas } from './schema-builder'
export { dashboardWidgets } from './tables/dashboard-widgets'
export { installedPlugins } from './tables/installed-plugins'
export { installedThemes } from './tables/installed-themes'
export { mediaFiles } from './tables/media-files'
export { sessions } from './tables/sessions'
export { siteDomains } from './tables/site-domains'
export { sites } from './tables/sites'
export { themeState } from './tables/theme-state'
export { userSiteRoles } from './tables/user-site-roles'
export { users } from './tables/users'
export { widgets } from './tables/widgets'

import { dashboardWidgets } from './tables/dashboard-widgets'
import { installedPlugins } from './tables/installed-plugins'
import { installedThemes } from './tables/installed-themes'
import { mediaFiles } from './tables/media-files'
import { sessions } from './tables/sessions'
import { siteDomains } from './tables/site-domains'
import { sites } from './tables/sites'
import { themeState } from './tables/theme-state'
import { userSiteRoles } from './tables/user-site-roles'
import { users } from './tables/users'
import { widgets } from './tables/widgets'

export const coreSchema = {
  sites,
  siteDomains,
  users,
  userSiteRoles,
  sessions,
  installedPlugins,
  installedThemes,
  themeState,
  mediaFiles,
  widgets,
  dashboardWidgets,
}
