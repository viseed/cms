import { z } from 'zod'

export const pluginManifestSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  description: z.string().max(1000),
  author: z.string().min(1),
  bundleUrl: z.string().url(),
  integrity: z.string().min(1),
  schemaSql: z.array(z.string()).optional(),
  adminComponents: z.array(z.string()).optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
})

export const installPluginSchema = z.object({
  bundleUrl: z.string().url(),
  integrity: z.string().min(1),
})

export type PluginManifestInput = z.infer<typeof pluginManifestSchema>
export type InstallPluginInput = z.infer<typeof installPluginSchema>
