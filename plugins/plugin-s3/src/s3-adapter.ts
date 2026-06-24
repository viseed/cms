import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StorageAdapter } from '@viseed/types'

export interface S3AdapterConfig {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Optional key prefix prepended to every object (e.g. "media"). */
  prefix?: string
  /** Public base URL / CDN domain used to build object URLs. */
  publicUrl?: string
  /** Custom endpoint (used by S3-compatible providers). */
  endpoint?: string
  /** Force path-style addressing (required by some S3-compatible providers). */
  forcePathStyle?: boolean
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

export class S3StorageAdapter implements StorageAdapter {
  protected client: S3Client
  protected bucket: string
  protected region: string
  protected prefix?: string
  protected publicUrl?: string

  constructor(config: S3AdapterConfig) {
    this.bucket = config.bucket
    this.region = config.region
    this.prefix = config.prefix
    this.publicUrl = config.publicUrl
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
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
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }

  isLocal(): boolean {
    return false
  }
}

/** Builds an S3 adapter from a resolved (decrypted) config payload. */
export function createS3Adapter(config: Record<string, unknown>): S3StorageAdapter {
  return new S3StorageAdapter({
    bucket: String(config.bucket ?? ''),
    region: String(config.region ?? ''),
    accessKeyId: String(config.accessKeyId ?? ''),
    secretAccessKey: String(config.secretAccessKey ?? ''),
    prefix: typeof config.prefix === 'string' ? config.prefix : undefined,
    publicUrl: typeof config.publicUrl === 'string' ? config.publicUrl : undefined,
  })
}
