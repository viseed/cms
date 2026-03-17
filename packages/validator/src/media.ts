import { z } from 'zod'

export const uploadMediaSchema = z.object({
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  alt: z.string().max(500).optional(),
})

export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  mimeType: z.string().optional(),
  search: z.string().optional(),
})

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>
export type MediaQuery = z.infer<typeof mediaQuerySchema>
