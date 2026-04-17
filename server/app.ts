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
  .map((origin) => origin.trim())
  .filter(Boolean)

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
      // Allow browsers to preflight without origin or same-origin requests
      if (!origin || configuredOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      // Allow any origin that ends with the production base domain if needed
      // but for now, we just stick to the whitelist
      if (env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
        callback(null, true)
        return
      }

      console.warn(`[CORS Blocked] Origin: ${origin}`)
      callback(new Error(`CORS blocked for origin: ${origin}`))
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
