import { loginSchema } from '@hana/validator'
import { Hono } from 'hono'

export function setupAuthRoutes(app: Hono): void {
  const auth = new Hono()

  auth.post('/login', async (c) => {
    const body = await c.req.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return c.json({ error: 'Invalid input', details: result.error.flatten() }, 400)
    }

    // TODO: implement actual authentication logic
    return c.json({ message: 'Login endpoint', email: result.data.email })
  })

  auth.post('/logout', async (c) => {
    // TODO: implement session invalidation
    return c.json({ message: 'Logged out' })
  })

  auth.get('/me', async (c) => {
    // TODO: implement session-based user retrieval
    return c.json({ message: 'Current user endpoint' })
  })

  app.route('/api/auth', auth)
}
