import { z } from 'zod'

/** Role slug: lowercase, starts with a letter, allows digits, hyphen, underscore. */
export const roleSlugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z][a-z0-9_-]*$/, 'Slug must be lowercase and may contain letters, digits, - or _.')

export const roleAssignmentSchema = z.object({
  siteId: z.string().min(1),
  roleSlug: roleSlugSchema,
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  assignments: z.array(roleAssignmentSchema).default([]),
})

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(255).optional(),
  assignments: z.array(roleAssignmentSchema).optional(),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(128),
})

export const createRoleSchema = z.object({
  slug: roleSlugSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  permissions: z.array(z.string()).default([]),
})

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullish(),
  permissions: z.array(z.string()).optional(),
})

export const transferOwnershipSchema = z.object({
  targetUserId: z.string().min(1),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type RoleAssignmentInput = z.infer<typeof roleAssignmentSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>
export type LoginInput = z.infer<typeof loginSchema>
