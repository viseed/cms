import { z } from 'zod'

export const contentStatusEnum = z.enum(['draft', 'published', 'archived'])

export interface MetaSeo {
  metaTitle?: string
  metaDescription?: string
  ogImage?: string
  canonicalUrl?: string
}

export const metaSeoSchema: z.ZodType<MetaSeo> = z
  .object({
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    ogImage: z.string().url().optional().or(z.literal('')),
    canonicalUrl: z.string().url().optional().or(z.literal('')),
  })
  .partial() as z.ZodType<MetaSeo>

export interface SchemaOrgItem {
  '@type': string
  '@id'?: string
  [key: string]: SchemaOrgValue
}

export type SchemaOrgValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SchemaOrgItem
  | Array<string | number | boolean | SchemaOrgItem>

export const schemaOrgItemSchema: z.ZodType<SchemaOrgItem> = z.lazy(() =>
  z
    .object({
      '@type': z.string().min(1),
      '@id': z.string().optional(),
    })
    .catchall(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        schemaOrgItemSchema,
        z.array(z.union([z.string(), z.number(), z.boolean(), schemaOrgItemSchema])),
      ]),
    ),
) as z.ZodType<SchemaOrgItem>

export const schemaOrgArraySchema = z.array(schemaOrgItemSchema)

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
  metaSeo: metaSeoSchema.optional(),
  schemaOrg: schemaOrgArraySchema.optional(),
  tocEnabled: z.boolean().optional(),
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
