import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

const client = new S3Client({
  region: 'auto',
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY,
    secretAccessKey: env.R2_SECRET_KEY,
  },
})

export async function uploadPdfToR2(input: { key: string; file: Buffer; contentType: string }) {
  await client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: input.key,
      Body: input.file,
      ContentType: input.contentType,
    })
  )
}

export async function deletePdfFromR2(key: string) {
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    })
  )
}

export async function createDownloadUrl(key: string, fileName: string) {
  if (env.R2_PUBLIC_URL_BASE) {
    return `${env.R2_PUBLIC_URL_BASE.replace(/\/$/, '')}/${key}`
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ResponseContentDisposition: `inline; filename="${fileName}"`,
    }),
    {
      expiresIn: env.R2_SIGNED_URL_TTL_SECONDS,
    }
  )
}

export function createStoredFileUrl(key: string) {
  if (env.R2_PUBLIC_URL_BASE) {
    return `${env.R2_PUBLIC_URL_BASE.replace(/\/$/, '')}/${key}`
  }

  return `r2://${env.R2_BUCKET}/${key}`
}

export async function calculateR2BucketUsage() {
  let totalBytes = 0
  let objectCount = 0
  let continuationToken: string | undefined

  try {
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: env.R2_BUCKET,
          ContinuationToken: continuationToken,
        })
      )

      if (response.Contents) {
        objectCount += response.Contents.length
        for (const obj of response.Contents) {
          totalBytes += obj.Size || 0
        }
      }

      continuationToken = response.NextContinuationToken
    } while (continuationToken)

    return totalBytes
  } catch (error) {
    return 0
  }
}
