import { config } from 'dotenv'
import { z } from 'zod'

config({ path: '.env.server' })
config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8787),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
  R2_ACCESS_KEY: z.string().min(1),
  R2_SECRET_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_PUBLIC_URL_BASE: z.string().url().optional(),
  R2_SIGNED_URL_TTL_SECONDS: z.coerce.number().default(3600),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().default(''),
  USER_VIEW_LIMIT: z.coerce.number().min(1).default(5),
  GEMINI_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const errors = parsed.error.format()
  const missing = Object.keys(errors)
    .filter((key) => key !== '_errors')
    .join(', ')

  console.error('\x1b[31m%s\x1b[0m', '❌ Invalid server environment variables:')
  console.error('\x1b[33m%s\x1b[0m', `Missing or invalid keys: ${missing}`)
  console.error('\x1b[90m%s\x1b[0m', 'Check your .env.server file against .env.server.example')

  throw new Error('Server environment validation failed.')
}

export const env = parsed.data
