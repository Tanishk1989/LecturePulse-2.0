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
import { ensureUploadDirs, UPLOADS_ROOT } from './config/storage'
import { prisma } from './config/db'

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
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error:
        'Database is unavailable. If you use Supabase, resume your project in the dashboard and verify DATABASE_URL.',
      timestamp: new Date().toISOString(),
    })
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' })
})

app.listen(PORT, () => {
  console.log(`LecturePulse 2.0 Backend listening on port ${PORT}`)
  console.log(`Local uploads served from ${path.resolve(UPLOADS_ROOT)}`)
  void prisma.$queryRaw`SELECT 1`
    .then(() => console.log('Database connection: OK'))
    .catch((error) => {
      console.error(
        'Database connection: FAILED —',
        error instanceof Error ? error.message : error,
      )
      console.error(
        'Tip: If using Supabase, open the project dashboard and resume the database, then check DATABASE_URL in BackEnd/.env.',
      )
    })
})
