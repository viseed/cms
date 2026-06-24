import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StorageAdapter } from '@viseed/types'

export interface R2AdapterConfig {
  accountId: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  prefix?: string
  publicUrl?: string
}

function joinKey(prefix: string | undefined, siteId: string, filename: string): string {
  const segments = [prefix?.replace(/^\/+|\/+$/g, ''), siteId, filename].filter(
    (segment): segment is string => Boolean(segment),
  )
  return segments.join('/')
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

/**
 * Cloudflare R2 is S3-compatible. It uses a fixed account-scoped endpoint and
 * the special `auto` region. A public bucket URL (`publicUrl`) is recommended
 * so files can be served via redirect; otherwise the account endpoint is used.
 */
export class R2StorageAdapter implements StorageAdapter {
  private client: S3Client
  private bucket: string
  private accountId: string
  private prefix?: string
  private publicUrl?: string

  constructor(config: R2AdapterConfig) {
    this.bucket = config.bucket
    this.accountId = config.accountId
    this.prefix = config.prefix
    this.publicUrl = config.publicUrl
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async save(
    filename: string,
    data: ArrayBuffer,
    siteId: string,
    contentType?: string,
  ): Promise<string> {
    const key = joinKey(this.prefix, siteId, filename)
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: new Uint8Array(data),
        ContentType: contentType,
      }),
    )
    return key
  }

  async delete(path: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }))
    } catch {
      // Ignore "object not found" errors
    }
  }

  getUrl(path: string, _siteId: string): string {
    const key = path.replace(/^\/+/, '')
    if (this.publicUrl) {
      return `${stripTrailingSlash(this.publicUrl)}/${key}`
    }
    return `https://${this.accountId}.r2.cloudflarestorage.com/${this.bucket}/${key}`
  }

  isLocal(): boolean {
    return false
  }
}

/** Builds an R2 adapter from a resolved (decrypted) config payload. */
export function createR2Adapter(config: Record<string, unknown>): R2StorageAdapter {
  return new R2StorageAdapter({
    accountId: String(config.accountId ?? ''),
    bucket: String(config.bucket ?? ''),
    accessKeyId: String(config.accessKeyId ?? ''),
    secretAccessKey: String(config.secretAccessKey ?? ''),
    prefix: typeof config.prefix === 'string' ? config.prefix : undefined,
    publicUrl: typeof config.publicUrl === 'string' ? config.publicUrl : undefined,
  })
}
