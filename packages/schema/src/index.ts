export { users } from './tables/users'
export { sessions } from './tables/sessions'
export { installedPlugins } from './tables/installed-plugins'
export { mergeSchemas } from './schema-builder'

import { users } from './tables/users'
import { sessions } from './tables/sessions'
import { installedPlugins } from './tables/installed-plugins'

export const coreSchema = {
  users,
  sessions,
  installedPlugins,
}
