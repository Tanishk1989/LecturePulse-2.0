import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'

const router = Router()

// GET /api/profiles - Get or create user profile config
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    let profile = await prisma.userProfile.findUnique({
      where: { userId },
    })

    if (!profile) {
      // Initialize a default profile if it doesn't exist
      profile = await prisma.userProfile.create({
        data: {
          userId,
          course: '',
          studyGoal: '',
          tutorStyle: 'balanced',
          summaryLength: 'auto',
          flashcardDifficulty: 'mixed',
          dailyReminder: false,
          dailyReminderTime: '09:00',
          streakAlerts: false,
        },
      })
    }

    res.json(profile)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to fetch user profile.')
  }
})

// PUT /api/profiles - Upsert user profile config
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const {
    course,
    studyGoal,
    tutorStyle,
    summaryLength,
    flashcardDifficulty,
    dailyReminder,
    dailyReminderTime,
    streakAlerts,
  } = req.body

  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        course: course !== undefined ? course : undefined,
        studyGoal: studyGoal !== undefined ? studyGoal : undefined,
        tutorStyle: tutorStyle !== undefined ? tutorStyle : undefined,
        summaryLength: summaryLength !== undefined ? summaryLength : undefined,
        flashcardDifficulty: flashcardDifficulty !== undefined ? flashcardDifficulty : undefined,
        dailyReminder: dailyReminder !== undefined ? dailyReminder : undefined,
        dailyReminderTime: dailyReminderTime !== undefined ? dailyReminderTime : undefined,
        streakAlerts: streakAlerts !== undefined ? streakAlerts : undefined,
      },
      create: {
        userId,
        course: course || '',
        studyGoal: studyGoal || '',
        tutorStyle: tutorStyle || 'balanced',
        summaryLength: summaryLength || 'auto',
        flashcardDifficulty: flashcardDifficulty || 'mixed',
        dailyReminder: dailyReminder !== undefined ? dailyReminder : false,
        dailyReminderTime: dailyReminderTime || '09:00',
        streakAlerts: streakAlerts !== undefined ? streakAlerts : false,
      },
    })

    res.json(profile)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to update user profile.')
  }
})

// DELETE /api/profiles - Delete user profile
router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Check if profile exists before trying to delete to avoid 404/not found database error
    const exists = await prisma.userProfile.findUnique({ where: { userId } })
    if (exists) {
      await prisma.userProfile.delete({
        where: { userId },
      })
    }
    res.json({ success: true, message: 'User profile deleted successfully.' })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to delete user profile.')
  }
})

export default router
