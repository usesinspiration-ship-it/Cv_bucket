import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { cvRouter } from './routes/cvRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const app = express()

// ─── Allowed Origins ──────────────────────────────────────────────────────────
// Always include the production domain. CLIENT_ORIGIN may add more (comma-separated).
const ALWAYS_ALLOWED = ['https://jkfenesta.com', 'https://www.jkfenesta.com']

const allowedOrigins = new Set<string>([
  ...ALWAYS_ALLOWED,
  ...env.CLIENT_ORIGIN.split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
])

console.log(`[CORS] Allowed origins: ${[...allowedOrigins].join(', ')}`)

// ─── CORS Middleware ───────────────────────────────────────────────────────────
// Written as raw middleware so headers are always set correctly.
// Works regardless of cors() package internals or env var values.
app.use((req, res, next) => {
  const origin = (req.headers.origin ?? '').replace(/\/$/, '')

  const isAllowed =
    !origin || // same-origin or no-origin requests (curl, server-to-server)
    allowedOrigins.has(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) // local dev

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Vary', 'Origin')
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      res.setHeader('Access-Control-Max-Age', '600')
      res.sendStatus(204)
    } else {
      console.warn(`[CORS Blocked] Preflight from: ${origin}`)
      res.sendStatus(403)
    }
    return
  }

  if (!isAllowed && origin) {
    console.warn(`[CORS Blocked] Request from: ${origin}`)
  }

  next()
})

// ─── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }))

// ─── Request Logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  if (env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  }
  next()
})

// ─── Routes ────────────────────────────────────────────────────────────────────
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
