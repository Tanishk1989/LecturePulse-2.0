import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'

const router = Router()

// Helper to convert UTC Date to YYYY-MM-DD local string
function getLocalDateString(utcDate: Date, offsetMinutes: number): string {
  const adjusted = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000)
  return adjusted.toISOString().split('T')[0]
}

// GET /api/exam-countdown - Fetch exam countdown configuration, study hours, and streak data
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const offsetMinutes = Number(req.query.timezoneOffset) || 0

  try {
    // 1. Fetch current exam
    const exam = await prisma.exam.findUnique({
      where: { userId },
    })

    // 2. Fetch all study sessions to aggregate durations and subjects
    const sessions = await prisma.studySession.findMany({
      where: { userId },
      include: {
        lecture: {
          select: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Group stats by local date
    const dailyStats: Record<string, { duration: number; subjects: string[] }> = {}
    sessions.forEach((s) => {
      const dateStr = getLocalDateString(s.createdAt, offsetMinutes)
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { duration: 0, subjects: [] }
      }
      dailyStats[dateStr].duration += s.duration
      if (s.lecture?.subject) {
        const sub = s.lecture.subject.trim()
        if (sub && !dailyStats[dateStr].subjects.includes(sub)) {
          dailyStats[dateStr].subjects.push(sub)
        }
      }
    })

    // 3. Fetch streak stats
    const userStreak = await prisma.userStreak.findUnique({
      where: { userId },
    })

    res.json({
      exam,
      durations: dailyStats, // date -> { duration, subjects }
      currentStreak: userStreak?.currentStreak || 0,
      longestStreak: userStreak?.longestStreak || 0,
    })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve exam countdown data.')
  }
})

// POST /api/exam-countdown - Create or update active exam countdown
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { title, date } = req.body
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' })
  }

  try {
    const exam = await prisma.exam.upsert({
      where: { userId },
      update: {
        title,
        date: new Date(date),
      },
      create: {
        userId,
        title,
        date: new Date(date),
      },
    })

    res.json(exam)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to update exam countdown.')
  }
})

// DELETE /api/exam-countdown - Delete active exam countdown
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await prisma.exam.deleteMany({
      where: { userId },
    })

    res.json({ success: true, message: 'Exam countdown deleted successfully.' })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to delete exam countdown.')
  }
})

export default router
