import { Request, Response, NextFunction } from 'express'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { firebaseAuth } from '../config/firebase'

export interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch {
    console.warn('Auth verification failed; session rejected.')
    return res.status(401).json({ error: 'Invalid or expired authentication session.' })
  }
}
