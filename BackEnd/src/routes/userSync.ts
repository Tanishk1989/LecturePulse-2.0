import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'

export function isValidSyncDocument(key: unknown, data: any): boolean {
  if (typeof key !== 'string' || Buffer.byteLength(JSON.stringify(data ?? null), 'utf8') > 100_000) return false
  if (key === 'preferences') return data && typeof data === 'object' && !Array.isArray(data)
    && ['general', 'notifications', 'ai'].every(field => !data[field] || typeof data[field] === 'object' && !Array.isArray(data[field]))
  if (key === 'timetable') return Array.isArray(data) && data.length <= 200 && new Set(data.map(row => row?.id)).size === data.length && data.every(row =>
    typeof row?.id === 'string' && row.id.length <= 100 && typeof row.title === 'string' && row.title.length <= 300
    && typeof row.subject === 'string' && Number.isInteger(row.dayOfWeek) && row.dayOfWeek >= 0 && row.dayOfWeek <= 6
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.startTime) && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.endTime)
    && typeof row.autoRecordReminder === 'boolean')
  if (key === 'tutor-recent') return Array.isArray(data) && data.length <= 5 && data.every(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id))
  if (/^tutor-history:(all|[A-Za-z0-9_-]{1,100})$/.test(key)) return Array.isArray(data) && data.length <= 100 && new Set(data.map(message => message?.id)).size === data.length && data.every(message =>
    ['user', 'assistant', 'context-notice'].includes(message?.role) && typeof message.content === 'string'
    && message.content.length <= 30_000 && typeof message.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(message.id))
  return false
}

const router = Router()
router.use(requireAuth)

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : ''
    const docs = await prisma.$queryRaw<Array<{ key: string; data: unknown; revision: number }>>`
      SELECT document_key AS key,data,revision FROM user_sync_documents WHERE user_id=${req.user!.uid} AND document_key>${cursor} ORDER BY document_key LIMIT 100`
    res.json({ documents: docs, nextCursor: docs.length === 100 ? docs[99].key : null })
  } catch (error) { sendRouteError(res, error, 'Could not load synced account data.') }
})

router.get('/:key', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const docs = await prisma.$queryRaw<Array<{ key: string; data: unknown; revision: number }>>`
      SELECT document_key AS key,data,revision FROM user_sync_documents WHERE user_id=${req.user!.uid} AND document_key=${req.params.key}`
    res.json(docs[0] ?? { key: req.params.key, data: null, revision: 0 })
  } catch (error) { sendRouteError(res, error, 'Could not load synced account data.') }
})

router.put('/:key', async (req: AuthenticatedRequest, res: Response) => {
  const { data, revision } = req.body ?? {}
  const key = req.params.key
  if (!isValidSyncDocument(key, data) || !Number.isInteger(revision) || revision < 0) {
    return res.status(400).json({ error: 'Invalid sync document or revision.' })
  }
  try {
    const lectureId = key.startsWith('tutor-history:') ? key.slice('tutor-history:'.length) : null
    if (lectureId && lectureId !== 'all' && !await prisma.lecture.findFirst({ where: { id: lectureId, userId: req.user!.uid }, select: { id: true } })) {
      return res.status(404).json({ error: 'Lecture not found.' })
    }
    // CAS protects newer edits on another device. Identity comes only from verified authentication.
    const docs = await prisma.$queryRaw<Array<{ key: string; data: unknown; revision: number }>>`
      INSERT INTO user_sync_documents (user_id,document_key,data)
      SELECT ${req.user!.uid},${key},${JSON.stringify(data)}::jsonb WHERE ${revision}=0
      ON CONFLICT (user_id,document_key) DO NOTHING RETURNING document_key AS key,data,revision`
    if (docs[0]) return res.json(docs[0])
    const updated = await prisma.$queryRaw<Array<{ key: string; data: unknown; revision: number }>>`
      UPDATE user_sync_documents SET data=${JSON.stringify(data)}::jsonb,revision=revision+1,updated_at=NOW()
      WHERE user_id=${req.user!.uid} AND document_key=${key} AND revision=${revision}
      RETURNING document_key AS key,data,revision`
    if (!updated.length) return res.status(409).json({ error: 'This document changed on another device. Refresh and merge before retrying.', code: 'SYNC_CONFLICT' })
    res.json(updated[0])
  } catch (error) { sendRouteError(res, error, 'Could not sync account data.') }
})

export default router
