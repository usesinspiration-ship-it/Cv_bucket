import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { cvRouter } from './routes/cvRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const app = express()

const configuredOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim().replace(/\/$/, '')) // Remove trailing slashes
  .filter(Boolean)

// Always allow the production client domains regardless of CLIENT_ORIGIN env var
const permanentOrigins = ['https://jkfenesta.com', 'https://www.jkfenesta.com']
for (const origin of permanentOrigins) {
  if (!configuredOrigins.includes(origin)) {
    configuredOrigins.push(origin)
  }
}

console.log(`[CORS] Whitelist initialized with origins: ${configuredOrigins.join(', ')}`)

const isLocalDevOrigin = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)

// Request logging for debugging production 404s
app.use((req, _res, next) => {
  if (env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  }
  next()
})

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin ? origin.replace(/\/$/, '') : undefined;

      // Allow browsers to preflight without origin or same-origin requests
      if (!normalizedOrigin || configuredOrigins.includes(normalizedOrigin)) {
        callback(null, true)
        return
      }

      if (env.NODE_ENV !== 'production' && isLocalDevOrigin(normalizedOrigin)) {
        callback(null, true)
        return
      }

      console.warn(`[CORS Blocked] Origin: ${normalizedOrigin} is not in whitelist: [${configuredOrigins.join(', ')}]`)
      callback(new Error(`CORS: Origin ${normalizedOrigin} not allowed`), false)
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'cv-bucket-api',
  })
})

app.use('/api/cvs', cvRouter)

if (env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../dist')
  app.use(express.static(distPath))

  // Fallback to index.html for SPA routing
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)
