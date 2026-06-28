import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { deleteFileByUrl } from '../config/storage'
import { triggerLectureProcessing } from '../services/processingService'
import { sendRouteError } from '../utils/apiError'
import { deriveProcessingStatus, isProcessingStale } from '../utils/processingStatus'

const router = Router()

// GET /api/lectures - List all lectures for the authenticated user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const lectures = await prisma.lecture.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(lectures)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve lectures.')
  }
})

// GET /api/lectures/:id/processing-status - Combined status for polling (single DB round-trip)
router.get('/:id/processing-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id, userId },
      select: { status: true, updatedAt: true },
    })

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    const [transcript, notes] = await Promise.all([
      prisma.transcript.findFirst({
        where: { lectureId: id, userId },
        select: { id: true, status: true, updatedAt: true },
      }),
      prisma.lectureNote.findFirst({
        where: { lectureId: id, userId },
        select: { status: true },
      }),
    ])

    let lectureStatus = lecture.status
    const transcriptStatus = transcript?.status ?? null
    const notesStatus = notes?.status ?? null

    let derived = deriveProcessingStatus(lectureStatus, transcriptStatus, notesStatus)

    const lastActivity = transcript?.updatedAt ?? lecture.updatedAt
    if (derived.isProcessing && isProcessingStale(lastActivity)) {
      await prisma.lecture.update({
        where: { id },
        data: { status: 'failed' },
      })
      if (transcript) {
        await prisma.transcript.update({
          where: { id: transcript.id },
          data: {
            status: 'failed',
            errorMessage: 'Processing timed out. Please try again.',
          },
        }).catch(() => {})
      }
      lectureStatus = 'failed'
      derived = deriveProcessingStatus('failed', 'failed', notesStatus)
    }

    res.json(derived)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve processing status.')
  }
})

// GET /api/lectures/:id - Get a single lecture by ID
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id, userId },
    })

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    res.json(lecture)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to retrieve lecture.')
  }
})

// POST /api/lectures - Create a new lecture record
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const {
    id,
    title,
    fileType,
    fileUrl,
    duration,
    source,
    subject,
  } = req.body

  if (!title || !fileType || !fileUrl) {
    return res.status(400).json({ error: 'Missing required parameters.' })
  }

  try {
    const lecture = await prisma.lecture.create({
      data: {
        id: id || undefined,
        userId,
        title: title.trim(),
        fileType,
        fileUrl,
        duration: duration ? parseInt(duration, 10) : null,
        status: 'uploaded',
        source: source || 'upload',
        subject: subject || null,
      },
    })
    res.status(201).json(lecture)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to create lecture.')
  }
})

// PATCH /api/lectures/:id - Update lecture properties (e.g. title, favorite, status)
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { title, favorite, status, subject, tags } = req.body

  try {
    // Verify ownership
    const existing = await prisma.lecture.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    let normalizedTags: string[] | undefined
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'tags must be an array of strings.' })
      }
      normalizedTags = tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    }

    const updated = await prisma.lecture.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        favorite: favorite !== undefined ? favorite : undefined,
        status: status !== undefined ? status : undefined,
        subject: subject !== undefined ? (subject ? String(subject).trim() : null) : undefined,
        tags: normalizedTags !== undefined ? normalizedTags : undefined,
      },
    })

    res.json(updated)
  } catch (error) {
    return sendRouteError(res, error, 'Failed to update lecture.')
  }
})

// DELETE /api/lectures/:id - Delete a lecture, its database records, and its storage file
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id, userId },
    })

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    if (lecture.fileUrl) {
      try {
        deleteFileByUrl(lecture.fileUrl)
      } catch (err) {
        console.warn('Local file deletion failed or file did not exist:', err)
      }
    }

    // Cascade delete on relations is handled by database if configured,
    // otherwise Prisma client can delete them or cascade via schema.
    await prisma.lecture.delete({
      where: { id },
    })

    res.json({ message: 'Lecture deleted successfully.' })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to delete lecture.')
  }
})

// POST /api/lectures/:id/process - Trigger background lecture transcription & notes generation
router.post('/:id/process', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  const { id } = req.params
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { generateNotes, forceRetranscribe, transcriptionLanguage, outputLanguage } = req.body

  try {
    const lecture = await prisma.lecture.findFirst({
      where: { id, userId },
    })

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }

    if (lecture.status === 'processing') {
      return res.status(202).json({ status: 'processing', id })
    }

    // Update status to processing
    await prisma.lecture.update({
      where: { id },
      data: { status: 'processing' },
    })

    // Run processing job in background asynchronously
    void triggerLectureProcessing(id, userId, {
      generateNotes: generateNotes !== false,
      forceRetranscribe: forceRetranscribe === true,
      transcriptionLanguage:
        typeof transcriptionLanguage === 'string' ? transcriptionLanguage : undefined,
      outputLanguage: typeof outputLanguage === 'string' ? outputLanguage : undefined,
    }).catch((err) => {
      console.error(`Background processing job failed for lecture ${id}:`, err)
    })

    res.status(202).json({ status: 'processing', id })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to initiate processing.')
  }
})

export default router
