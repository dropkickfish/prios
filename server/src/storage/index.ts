import { LocalStorageAdapter } from './local.js'
import { S3StorageAdapter } from './s3.js'
import type { StoragePort } from './port.js'

export function createStorage(): StoragePort {
  const type = process.env.STORAGE_TYPE ?? 'local'

  if (type === 's3') {
    const required = (key: string) => {
      const val = process.env[key]
      if (!val) throw new Error(`Missing required env var: ${key}`)
      return val
    }
    return new S3StorageAdapter(
      required('STORAGE_S3_BUCKET'),
      required('STORAGE_PUBLIC_URL'),
      {
        endpoint: process.env.STORAGE_S3_ENDPOINT,
        region: process.env.STORAGE_S3_REGION ?? 'auto',
        accessKeyId: required('STORAGE_S3_ACCESS_KEY'),
        secretAccessKey: required('STORAGE_S3_SECRET_KEY'),
      }
    )
  }

  return new LocalStorageAdapter(
    process.env.STORAGE_LOCAL_PATH ?? './data/uploads',
    process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3000/uploads'
  )
}

export type { StoragePort } from './port.js'
