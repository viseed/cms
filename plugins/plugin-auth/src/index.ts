import type { CMSPlugin } from '@hanabi/types'
import { authSchema } from './schema'
import { setupAuthRoutes } from './routes'

export function authPlugin(): CMSPlugin {
  return {
    name: 'auth',
    version: '0.1.0',
    schema: authSchema,
    routes: setupAuthRoutes,
  }
}

export { authSchema } from './schema'
