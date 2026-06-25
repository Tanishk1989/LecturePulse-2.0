import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'

const router = Router()

// GET /api/analytics/institution — anonymized cross-user learning analytics
router.get('/institution', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalStudents,
      totalLectures,
      totalQuizAttempts,
      wrongAttempts,
      weakConcepts,
      feedbackRows,
    ] = await Promise.all([
      prisma.lecture.groupBy({
        by: ['userId'],
        _count: { userId: true },
      }),
      prisma.lecture.count({ where: { status: 'completed' } }),
      prisma.conceptQuizAttempt.count(),
      prisma.conceptQuizAttempt.findMany({
        where: { isCorrect: false },
        include: { concept: { select: { name: true } } },
        take: 500,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.kgConcept.findMany({
        select: { name: true, lectureId: true },
        take: 200,
      }),
      prisma.aiFeedback.findMany({
        where: { feedback: { in: ['incorrect', 'unclear', 'too_hard', 'confusing'] } },
        select: { subject: true, feedback: true },
        take: 200,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const conceptWrongCounts = new Map<string, number>()
    for (const attempt of wrongAttempts) {
      const name = attempt.concept?.name ?? 'Unknown concept'
      conceptWrongCounts.set(name, (conceptWrongCounts.get(name) ?? 0) + 1)
    }

    const confusingTopics = [...conceptWrongCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([concept, wrongCount]) => ({
        concept,
        wrongCount,
        studentCount: wrongCount,
      }))

    const subjectConfusion = new Map<string, number>()
    for (const row of feedbackRows) {
      const key = row.subject?.trim() || 'General'
      subjectConfusion.set(key, (subjectConfusion.get(key) ?? 0) + 1)
    }

    const subjectsNeedingReview = [...subjectConfusion.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([subject, reportCount]) => ({ subject, reportCount }))

    const conceptFrequency = new Map<string, number>()
    for (const concept of weakConcepts) {
      conceptFrequency.set(concept.name, (conceptFrequency.get(concept.name) ?? 0) + 1)
    }

    const popularConcepts = [...conceptFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([concept, lectureCount]) => ({ concept, lectureCount }))

    res.json({
      meta: {
        anonymized: true,
        generatedAt: new Date().toISOString(),
      },
      overview: {
        activeStudents: totalStudents.length,
        completedLectures: totalLectures,
        quizAttempts: totalQuizAttempts,
      },
      confusingTopics,
      subjectsNeedingReview,
      popularConcepts,
    })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to load institution analytics.')
  }
})

export default router
