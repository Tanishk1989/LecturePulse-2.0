import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'
import { extractAndStoreConcepts } from '../services/conceptExtractor'
import { getRelatedLectureIds } from '../services/crossLectureService'

const router = Router()

function computeMastery(
  flashcardAttempts: { reviewAttempts: number; correctAttempts: number }[],
  quizAttempts: { isCorrect: boolean }[],
): number | null {
  let total = 0
  let correct = 0

  for (const card of flashcardAttempts) {
    total += card.reviewAttempts
    correct += card.correctAttempts
  }

  for (const attempt of quizAttempts) {
    total += 1
    if (attempt.isCorrect) correct += 1
  }

  if (total === 0) return null
  return Math.round((correct / total) * 100)
}

function masteryTier(mastery: number | null): 'mastered' | 'learning' | 'weak' | 'untested' {
  if (mastery === null) return 'untested'
  if (mastery >= 70) return 'mastered'
  if (mastery >= 40) return 'learning'
  return 'weak'
}

async function backfillPendingExtractions(userId: string): Promise<void> {
  const pending = await prisma.lecture.findMany({
    where: {
      userId,
      kgStatus: { in: ['pending', 'failed'] },
      status: 'completed',
    },
    include: {
      transcripts: { where: { status: 'completed' }, take: 1 },
    },
    take: 3,
  })

  for (const lecture of pending) {
    const transcript = lecture.transcripts[0]?.fullText?.trim()
    if (!transcript) continue

    void extractAndStoreConcepts(lecture.id, userId, transcript).catch((err) => {
      console.error(`KG backfill failed for lecture ${lecture.id}:`, err)
    })
  }
}

// GET /api/knowledge-graph - Full graph for the authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    void backfillPendingExtractions(userId)
    const { syncCrossLectureLinks } = await import('../services/crossLectureService')
    await syncCrossLectureLinks(userId)

    const [concepts, links, lectures, flashcards, quizAttempts] = await Promise.all([
      prisma.kgConcept.findMany({
        where: { userId },
        include: { lecture: { select: { id: true, title: true, kgStatus: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.kgLink.findMany({ where: { userId } }),
      prisma.lecture.findMany({
        where: { userId },
        select: { id: true, title: true, status: true, kgStatus: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.flashcard.findMany({
        where: { userId },
        select: {
          conceptId: true,
          conceptName: true,
          lectureId: true,
          reviewAttempts: true,
          correctAttempts: true,
        },
      }),
      prisma.conceptQuizAttempt.findMany({
        where: { userId },
        select: { conceptId: true, isCorrect: true },
      }),
    ])

    const extractingCount = lectures.filter((l) => l.kgStatus === 'extracting').length
    const hasLectures = lectures.length > 0

    const lectureTitleById = new Map(lectures.map((l) => [l.id, l.title]))

    const nodes = concepts.map((concept) => {
      const relatedFlashcards = flashcards.filter(
        (f) =>
          f.conceptId === concept.id ||
          (f.conceptName &&
            f.conceptName.toLowerCase() === concept.name.toLowerCase() &&
            f.lectureId === concept.lectureId),
      )
      const relatedQuiz = quizAttempts.filter((a) => a.conceptId === concept.id)
      const mastery = computeMastery(relatedFlashcards, relatedQuiz)
      const linkCount = links.filter(
        (l) => l.fromConceptId === concept.id || l.toConceptId === concept.id,
      ).length
      const relatedLectureIds = getRelatedLectureIds(
        concept.id,
        concept.name,
        concept.lectureId,
        concepts,
      )

      return {
        id: concept.id,
        name: concept.name,
        description: concept.description,
        lectureId: concept.lectureId,
        lectureTitle: concept.lecture.title,
        mastery,
        masteryTier: masteryTier(mastery),
        linkCount,
        relatedLectureIds,
        relatedLectureTitles: relatedLectureIds.map((id) => lectureTitleById.get(id) ?? 'Lecture'),
      }
    })

    res.json({
      nodes,
      links: links.map((l) => ({
        id: l.id,
        fromConceptId: l.fromConceptId,
        toConceptId: l.toConceptId,
        lectureId: l.lectureId,
        linkType: (l as { linkType?: string }).linkType ?? 'intra',
      })),
      meta: {
        hasLectures,
        conceptCount: nodes.length,
        extractingCount,
        pendingExtraction: lectures.some((l) => l.kgStatus === 'pending' || l.kgStatus === 'extracting'),
      },
    })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to load knowledge graph.')
  }
})

// POST /api/knowledge-graph/extract/:lectureId - Trigger concept extraction
router.post('/extract/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { lectureId } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id: lectureId, userId },
      include: { transcripts: { where: { status: 'completed' }, take: 1 } },
    })

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    const transcript = lecture.transcripts[0]?.fullText?.trim()
    if (!transcript) {
      return res.status(400).json({ error: 'No completed transcript available for this lecture.' })
    }

    await extractAndStoreConcepts(lectureId, userId, transcript)
    res.json({ message: 'Concept extraction completed.' })
  } catch (error) {
    return sendRouteError(res, error, 'Concept extraction failed.')
  }
})

// POST /api/knowledge-graph/quiz-attempts - Record a concept quiz answer
router.post('/quiz-attempts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { conceptId, lectureId, question, selectedAnswer, correctAnswer, isCorrect } = req.body

  if (!conceptId || !lectureId || !question || !selectedAnswer || !correctAnswer) {
    return res.status(400).json({ error: 'Missing required quiz attempt fields.' })
  }

  try {
    const concept = await prisma.kgConcept.findFirst({
      where: { id: conceptId, userId, lectureId },
    })

    if (!concept) {
      return res.status(404).json({ error: 'Concept not found.' })
    }

    const attempt = await prisma.conceptQuizAttempt.create({
      data: {
        userId,
        conceptId,
        lectureId,
        question: String(question),
        selectedAnswer: String(selectedAnswer),
        correctAnswer: String(correctAnswer),
        isCorrect: Boolean(isCorrect),
      },
    })

    res.status(201).json(attempt)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to save quiz attempt.')
  }
})

// GET /api/knowledge-graph/lecture-quiz-attempts/:lectureId
router.get('/lecture-quiz-attempts/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { lectureId } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const attempts = await prisma.lectureQuizAttempt.findMany({
      where: { userId, lectureId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json({ attempts })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to load quiz attempts.')
  }
})

// POST /api/knowledge-graph/lecture-quiz-attempts
router.post('/lecture-quiz-attempts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { lectureId, question, selectedAnswer, correctAnswer, isCorrect, difficulty } = req.body
  if (!lectureId || !question || !selectedAnswer || !correctAnswer) {
    return res.status(400).json({ error: 'Missing required lecture quiz attempt fields.' })
  }

  try {
    const attempt = await prisma.lectureQuizAttempt.create({
      data: {
        userId,
        lectureId: String(lectureId),
        question: String(question),
        selectedAnswer: String(selectedAnswer),
        correctAnswer: String(correctAnswer),
        isCorrect: Boolean(isCorrect),
        difficulty: typeof difficulty === 'string' ? difficulty : 'medium',
      },
    })
    res.status(201).json(attempt)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to save lecture quiz attempt.')
  }
})

export default router
