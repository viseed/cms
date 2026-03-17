import { z } from 'zod'

export const contentStatusEnum = z.enum(['draft', 'published', 'archived'])

export const createContentSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  body: z.string().optional(),
  status: contentStatusEnum.default('draft'),
  metadata: z.record(z.unknown()).optional(),
})

export const updateContentSchema = createContentSchema.partial()

export const contentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: contentStatusEnum.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateContentInput = z.infer<typeof createContentSchema>
export type UpdateContentInput = z.infer<typeof updateContentSchema>
export type ContentQuery = z.infer<typeof contentQuerySchema>
