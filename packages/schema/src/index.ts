export { users } from './tables/users'
export { sessions } from './tables/sessions'
export { installedPlugins } from './tables/installed-plugins'
export { installedThemes } from './tables/installed-themes'
export { themeState } from './tables/theme-state'
export { mergeSchemas } from './schema-builder'

import { users } from './tables/users'
import { sessions } from './tables/sessions'
import { installedPlugins } from './tables/installed-plugins'
import { installedThemes } from './tables/installed-themes'
import { themeState } from './tables/theme-state'

export const coreSchema = {
  users,
  sessions,
  installedPlugins,
  installedThemes,
  themeState,
}
