import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'site_admin', 'site_content_writer']).default('site_content_writer'),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
