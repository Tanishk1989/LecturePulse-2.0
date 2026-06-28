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
import uploadRouter from './routes/uploads'
import profileRouter from './routes/profiles'
import streakRouter from './routes/streaks'
import examCountdownRouter from './routes/examCountdown'
import searchRouter from './routes/search'
import sharesRouter from './routes/shares'
import analyticsRouter from './routes/analytics'
import { ensureUploadDirs, UPLOADS_ROOT } from './config/storage'
import { prisma } from './config/db'
import { resolveApiError } from './utils/apiError'

ensureUploadDirs()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.use('/uploads', express.static(UPLOADS_ROOT))

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


app.get('/', (_req, res) => {
  res.json({
    name: 'LecturePulse API',
    status: 'running',
    docs: 'All routes are under /api',
    health: '/api/health',
    database: '/api/health/db',
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
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
      const message = error instanceof Error ? error.message : String(error)
      console.error(`Database connection attempt ${attempt} failed:`, message)

      if (attempt < maxAttempts) {
        const delayMs = 4000 * attempt
        console.log(`Retrying in ${delayMs / 1000}s…`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      console.error(
        'Database connection: FAILED after all retries. Check DATABASE_URL on Render — use port 5432 on db.PROJECT.supabase.co (direct), not port 6543 on the db host.',
      )
      throw error
    }
  }
}

async function startServer() {
  try {
    await connectDatabase()
  } catch {
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`LecturePulse 2.0 Backend listening on port ${PORT}`)
    console.log(`Local uploads served from ${path.resolve(UPLOADS_ROOT)}`)
  })
}

void startServer()
