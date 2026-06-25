import { Router, Response } from 'express'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { getUserTags, searchUserLectures } from '../services/searchService'
import { sendRouteError } from '../utils/apiError'

const router = Router()

// GET /api/search?q=keyword&limit=40
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const q = typeof req.query.q === 'string' ? req.query.q : ''
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 40
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 40

  if (!q.trim()) {
    return res.json({ results: [], query: '' })
  }

  try {
    const results = await searchUserLectures(userId, q, limit)
    res.json({ results, query: q.trim() })
  } catch (error) {
    return sendRouteError(res, error, 'Search failed.')
  }
})

// GET /api/search/tags — all distinct tags for the user
router.get('/tags', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const tags = await getUserTags(userId)
    res.json({ tags })
  } catch (error) {
    return sendRouteError(res, error, 'Failed to load tags.')
  }
})

export default router
