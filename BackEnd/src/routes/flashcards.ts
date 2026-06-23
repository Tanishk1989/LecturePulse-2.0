import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'
import { resolveConceptIdForFlashcard } from '../services/conceptExtractor'

const router = Router()

// GET /api/flashcards - Get all user's flashcards (with optional filtering)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { lectureId } = req.query

  try {
    const flashcards = await prisma.flashcard.findMany({
      where: {
        userId,
        lectureId: lectureId ? String(lectureId) : undefined,
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(flashcards)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve flashcards.')
  }
})

// GET /api/flashcards/lecture/:lectureId - Get flashcards by lecture ID
router.get('/lecture/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { lectureId } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const flashcards = await prisma.flashcard.findMany({
      where: { lectureId, userId },
      orderBy: { createdAt: 'asc' },
    })
    res.json(flashcards)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve flashcards.')
  }
})

// POST /api/flashcards/batch - Save a batch of generated flashcards
router.post('/batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { lectureId, cards } = req.body

  if (!lectureId || !Array.isArray(cards)) {
    return res.status(400).json({ error: 'lectureId and cards list are required.' })
  }

  try {
    const dataToInsert = await Promise.all(
      cards.map(async (card: { front: string; back: string; concept?: string | null; conceptId?: string | null }) => {
        const conceptName = card.concept?.trim() || null
        const conceptId =
          card.conceptId ||
          (conceptName ? await resolveConceptIdForFlashcard(lectureId, conceptName) : null)

        return {
          lectureId,
          userId,
          front: card.front.trim(),
          back: card.back.trim(),
          conceptId,
          conceptName,
          status: 'new',
        }
      }),
    )

    await prisma.flashcard.createMany({ data: dataToInsert })

    const created = await prisma.flashcard.findMany({
      where: { lectureId, userId },
    })

    res.status(201).json(created)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to batch save flashcards.')
  }
})

// PATCH /api/flashcards/:id - Study/update a flashcard status and review dates
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { status, nextReviewAt, lastReviewedAt, rating } = req.body

  try {
    const existing = await prisma.flashcard.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Flashcard not found.' })
    }

    const reviewRating = rating === 'good' || rating === 'hard' ? rating : null
    const reviewAttempts =
      reviewRating !== null ? existing.reviewAttempts + 1 : existing.reviewAttempts
    const correctAttempts =
      reviewRating === 'good' ? existing.correctAttempts + 1 : existing.correctAttempts

    const updated = await prisma.flashcard.update({
      where: { id },
      data: {
        status: status !== undefined ? status : undefined,
        nextReviewAt: nextReviewAt !== undefined ? (nextReviewAt ? new Date(nextReviewAt) : null) : undefined,
        lastReviewedAt: lastReviewedAt !== undefined ? (lastReviewedAt ? new Date(lastReviewedAt) : null) : undefined,
        reviewAttempts,
        correctAttempts,
      },
    })

    res.json(updated)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to update flashcard.')
  }
})

// DELETE /api/flashcards/:id - Delete a flashcard
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const existing = await prisma.flashcard.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Flashcard not found.' })
    }

    await prisma.flashcard.delete({
      where: { id },
    })

    res.json({ message: 'Flashcard deleted.' })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to delete flashcard.')
  }
})

// DELETE /api/flashcards/lecture/:lectureId - Delete all flashcards for a lecture
router.delete('/lecture/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { lectureId } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    await prisma.flashcard.deleteMany({
      where: { lectureId, userId },
    })
    res.json({ message: 'Flashcards deleted.' })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to delete flashcards.')
  }
})

export default router
