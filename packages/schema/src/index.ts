export { mergeSchemas } from './schema-builder'
export { installedPlugins } from './tables/installed-plugins'
export { installedThemes } from './tables/installed-themes'
export { sessions } from './tables/sessions'
export { themeState } from './tables/theme-state'
export { users } from './tables/users'

import { installedPlugins } from './tables/installed-plugins'
import { installedThemes } from './tables/installed-themes'
import { sessions } from './tables/sessions'
import { themeState } from './tables/theme-state'
import { users } from './tables/users'

export const coreSchema = {
  users,
  sessions,
  installedPlugins,
  installedThemes,
  themeState,
}
