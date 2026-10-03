import { NextFunction, Response } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest } from './auth'
import { sendRouteError } from '../utils/apiError'

export function requireLectureOwner(source: 'body' | 'params' = 'body') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })
    const lectureId = req[source]?.lectureId
    if (typeof lectureId !== 'string' || !lectureId.trim() || lectureId.length > 200) {
      return res.status(400).json({ error: 'A valid lectureId is required.' })
    }
    try {
      const lecture = await prisma.lecture.findFirst({ where: { id: lectureId, userId }, select: { id: true } })
      if (!lecture) return res.status(404).json({ error: 'Lecture not found.' })
      next()
    } catch (error) { return sendRouteError(res, error, 'Failed to verify lecture access.') }
  }
}
