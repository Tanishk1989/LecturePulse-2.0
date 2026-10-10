import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()

import lectureRouter from './routes/lectures'
import transcriptRouter from './routes/transcripts'
import notesRouter from './routes/notes'
import flashcardRouter from './routes/flashcards'
import aiRouter from './routes/ai'
import knowledgeGraphRouter from './routes/knowledgeGraph'
import uploadRouter, { mediaRouter } from './routes/uploads'
import profileRouter from './routes/profiles'
import streakRouter from './routes/streaks'
import examCountdownRouter from './routes/examCountdown'
import searchRouter from './routes/search'
import sharesRouter from './routes/shares'
import analyticsRouter from './routes/analytics'
import userSyncRouter from './routes/userSync'
import pushRouter from './routes/push'
import { initializePushKeys, startPushWorker } from './services/pushService'
import { ensureUploadDirs, initializeStorage, storageMode, UPLOADS_ROOT } from './config/storage'
import { prisma } from './config/db'
import { resolveApiError } from './utils/apiError'
import { isFfmpegAvailable } from './services/audioConvertService'
import { isBundledYouTubeDownloaderAvailable } from './services/youtubeService'
import { initializePersistenceSchema } from './services/persistenceSchema'
import { recoverProcessingJobs, startProcessingWorker } from './services/processingQueue'
import { createReadiness } from './services/readiness'

ensureUploadDirs()

const app = express()
const PORT = process.env.PORT || 5000
const audioConversionAvailable = isFfmpegAvailable()
const readiness = createReadiness()

app.use(cors())
app.use(express.json({ limit: '128kb' }))
app.use('/api', readiness.guard)

app.use('/uploads', mediaRouter)

app.use('/api/lectures', lectureRouter)
app.use('/api/transcripts', transcriptRouter)
app.use('/api/notes', notesRouter)
app.use('/api/flashcards', flashcardRouter)
app.use('/api/ai', aiRouter)
app.use('/api/knowledge-graph', knowledgeGraphRouter)
app.use('/api/uploads', uploadRouter)
app.use('/api/profiles', profileRouter)
app.use('/api/streaks', streakRouter)
app.use('/api/exam-countdown', examCountdownRouter)
app.use('/api/search', searchRouter)
app.use('/api/shares', sharesRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/user-sync', userSyncRouter)
app.use('/api/push', pushRouter)


app.get('/', (_req, res) => {
  res.json({
    name: 'LecturePulse API',
    status: readiness.isReady() ? 'running' : 'unavailable',
    docs: 'All routes are under /api',
    health: '/api/health',
    database: '/api/health/db',
  })
})

app.get('/api/health', (_req, res) => {
  if (!readiness.isReady()) {
    const failure = readiness.failure()
    res.setHeader('Retry-After', '30')
    res.status(503).json({ status: 'unhealthy', code: failure.code, error: failure.message })
    return
  }
  res.json({ status: 'healthy', storage: storageMode(), processingQueue: 'postgres', accountSync: 'postgres', aiLimits: 'postgres', push: 'web-push', auth: 'public-key-verification', audioConversion: audioConversionAvailable, youtubeDownloader: isBundledYouTubeDownloaderAvailable(), revision: process.env.RENDER_GIT_COMMIT?.slice(0, 7), timestamp: new Date().toISOString() })
})

app.get('/api/live', (_req, res) => {
  res.json({ status: 'running', ready: readiness.isReady() })
})

app.get('/api/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[Health] Database check failed:', error)
    const resolved = resolveApiError(error, 'Database health check failed.')
    res.status(resolved.status).json({
      status: 'unhealthy',
      database: 'disconnected',
      code: resolved.code,
      error: resolved.message,
      timestamp: new Date().toISOString(),
    })
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' })
})

async function connectDatabase(maxAttempts = 5): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`Connecting to database (attempt ${attempt}/${maxAttempts})…`)
      await prisma.$queryRaw`SELECT 1`
      console.log('Database connection: OK')
      return
    } catch (error) {
      const resolved = resolveApiError(error, 'Database connection failed.')
      console.error(`Database connection attempt ${attempt} failed:`, resolved.code)

      if (attempt < maxAttempts) {
        const delayMs = 4000 * attempt
        console.log(`Retrying in ${delayMs / 1000}s…`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      console.error(
        'Database connection: FAILED. Verify DATABASE_URL and database credentials on Render.',
      )
      throw error
    }
  }
}

async function startServer() {
  let stopped = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let stopWorkers = () => {}

  // Bind immediately so dependency failures return an explicit 503, not an endless timeout.
  // /api/health remains a readiness check and never reports a failed initialization as healthy.
  const server = app.listen(PORT, () => {
    console.log(`LecturePulse 2.0 Backend listening on port ${PORT}`)
    console.log(`Local uploads served from ${path.resolve(UPLOADS_ROOT)}`)
  })

  const initialize = async () => {
    try {
      await initializeStorage()
      await connectDatabase(1)
      await initializePersistenceSchema()
      await initializePushKeys()
      await recoverProcessingJobs()
      if (stopped) return
      const stopWorker = startProcessingWorker()
      const stopPush = startPushWorker()
      stopWorkers = () => { stopWorker(); stopPush() }
      readiness.markReady()
      console.log('Service initialization: READY')
    } catch (error) {
      readiness.markFailed(error)
      console.error('Service initialization failed:', readiness.failure().code)
      // Repeated invalid-password attempts can cause Supabase to ban the instance IP.
      // Credentials are loaded at boot; a corrected Render secret triggers a fresh deploy.
      if (!stopped && readiness.failure().code !== 'DB_AUTH_FAILED') {
        retryTimer = setTimeout(() => { void initialize() }, 30_000)
      }
    }
  }

  const stop = () => {
    stopped = true
    if (retryTimer) clearTimeout(retryTimer)
    stopWorkers()
    server.close(() => { void prisma.$disconnect() })
  }
  process.once('SIGTERM', stop)
  process.once('SIGINT', stop)
  await initialize()
}

void startServer()
