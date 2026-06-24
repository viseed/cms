import type { CMSPlugin, StorageProviderField } from '@viseed/types'
import { createS3Adapter } from './s3-adapter'

const FIELDS: StorageProviderField[] = [
  { name: 'bucket', label: 'Bucket', type: 'text', required: true },
  { name: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
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
    hint: 'CDN or public bucket URL used to serve files. Recommended for public buckets.',
  },
]

export function s3Plugin(): CMSPlugin {
  return {
    name: 'plugin-s3',
    version: '1.0.0',
    storageProviders: [
      {
        type: 's3',
        label: 'Amazon S3',
        fields: FIELDS,
        createAdapter: createS3Adapter,
      },
    ],
  }
}

export { createS3Adapter, type S3AdapterConfig, S3StorageAdapter } from './s3-adapter'
