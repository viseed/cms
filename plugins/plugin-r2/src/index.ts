import type { CMSPlugin, StorageProviderField } from '@viseed/types'
import { createR2Adapter } from './r2-adapter'

const FIELDS: StorageProviderField[] = [
  { name: 'accountId', label: 'Cloudflare Account ID', type: 'text', required: true },
  { name: 'bucket', label: 'Bucket', type: 'text', required: true },
  { name: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
  {
    name: 'secretAccessKey',
    label: 'Secret Access Key',
    type: 'password',
    required: true,
    secret: true,
    hint: 'Stored encrypted. Leave as is to keep the current secret.',
  },
  { name: 'prefix', label: 'Key prefix', type: 'text', placeholder: 'media' },
  {
    name: 'publicUrl',
    label: 'Public base URL',
    type: 'text',
    placeholder: 'https://cdn.example.com',
    hint: 'Public bucket / custom domain URL used to serve files. Recommended for public buckets.',
  },
]

export function r2Plugin(): CMSPlugin {
  return {
    name: 'plugin-r2',
    version: '1.0.0',
    storageProviders: [
      {
        type: 'r2',
        label: 'Cloudflare R2',
        fields: FIELDS,
        createAdapter: createR2Adapter,
      },
    ],
  }
}

export { createR2Adapter, type R2AdapterConfig, R2StorageAdapter } from './r2-adapter'
