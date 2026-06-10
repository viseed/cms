import type { CMSRouteContextHelpers } from '@viseed/types'
import { loginSchema } from '@viseed/validator'
import type { Hono, Context } from 'hono'

export function setupAuthRoutes(_app: Hono, helpers: CMSRouteContextHelpers): void {
  const auth = helpers.createSubApp('/api/auth')

  auth.post('/login', async (c: Context) => {
    const body = await c.req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    // TODO: implement actual authentication logic
    return c.json({ message: 'Login endpoint', email: result.data.email })
  })

  auth.post('/logout', async (c: Context) => {
    // TODO: implement session invalidation
    return c.json({ message: 'Logged out' })
  })

  auth.get('/me', async (c: Context) => {
    // TODO: implement site-user session based retrieval (separate from admin auth in core)
    return c.json({ message: 'Current site user endpoint' })
  })
}
