import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'

const router = Router()

// GET /api/notes - List all notes for the authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const notes = await prisma.lectureNote.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
    res.json(notes)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve notes.')
  }
})

// GET /api/notes/lecture/:lectureId - Get study notes by lecture ID
router.get('/lecture/:lectureId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { lectureId } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const note = await prisma.lectureNote.findFirst({
      where: { lectureId, userId },
    })

    if (!note) {
      return res.status(404).json({ error: 'Lecture notes not found.' })
    }

    res.json(note)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve notes.')
  }
})

// POST /api/notes - Create or update study notes manually
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const {
    lectureId,
    summary,
    keyConcepts,
    importantPoints,
    definitions,
    examples,
    mindMap,
    questions,
    examTips,
    status,
  } = req.body

  if (!lectureId) {
    return res.status(400).json({ error: 'lectureId is required.' })
  }

  try {
    const existing = await prisma.lectureNote.findFirst({
      where: { lectureId, userId },
    })

    const payload = {
      lectureId,
      userId,
      summary: summary || null,
      keyConcepts: keyConcepts || [],
      importantPoints: importantPoints || [],
      definitions: definitions || [],
      examples: examples || [],
      mindMap: mindMap || {},
      questions: questions || [],
      examTips: examTips || {},
      status: status || 'completed',
    }

    if (existing) {
      const updated = await prisma.lectureNote.update({
        where: { id: existing.id },
        data: payload,
      })
      return res.json(updated)
    } else {
      const created = await prisma.lectureNote.create({
        data: payload,
      })
      return res.status(201).json(created)
    }
  } catch (error) {
    return sendRouteError(res, error, 'Failed to save notes.')
  }
})

// PATCH /api/notes/:id - Update notes manually by notes record ID
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const {
    summary,
    keyConcepts,
    importantPoints,
    definitions,
    examples,
    mindMap,
    questions,
    examTips,
    status,
    errorMessage,
  } = req.body

  try {
    const existing = await prisma.lectureNote.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Lecture notes not found.' })
    }

    const updated = await prisma.lectureNote.update({
      where: { id },
      data: {
        summary: summary !== undefined ? summary : undefined,
        keyConcepts: keyConcepts !== undefined ? keyConcepts : undefined,
        importantPoints: importantPoints !== undefined ? importantPoints : undefined,
        definitions: definitions !== undefined ? definitions : undefined,
        examples: examples !== undefined ? examples : undefined,
        mindMap: mindMap !== undefined ? mindMap : undefined,
        questions: questions !== undefined ? questions : undefined,
        examTips: examTips !== undefined ? examTips : undefined,
        status: status !== undefined ? status : undefined,
        errorMessage: errorMessage !== undefined ? errorMessage : undefined,
      },
    })

    res.json(updated)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to update notes.')
  }
})

export default router
