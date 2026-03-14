import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { StoragePort, StorageFile } from './port.js'

export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client

  constructor(
    private readonly bucket: string,
    private readonly publicUrl: string,
    config: {
      endpoint?: string
      region: string
      accessKeyId: string
      secretAccessKey: string
    }
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: !!config.endpoint, // required for MinIO / Garage
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async put(key: string, data: Buffer, mimeType: string): Promise<StorageFile> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
      ContentLength: data.byteLength,
    }))
    return { key, mimeType, size: data.byteLength }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (!keys.length) return
    for (let i = 0; i < keys.length; i += 1000) {
      await this.client.send(new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.slice(i, i + 1000).map(Key => ({ Key })) },
      }))
    }
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  async listKeys(prefix = ''): Promise<string[]> {
    const keys: string[] = []
    let token: string | undefined
    do {
      const res = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }))
      for (const obj of res.Contents ?? []) {
        if (obj.Key) keys.push(obj.Key)
      }
      token = res.NextContinuationToken
    } while (token)
    return keys
  }
}
