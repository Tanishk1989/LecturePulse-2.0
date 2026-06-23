import { Request, Response, NextFunction } from 'express'
import { admin } from '../config/firebase'

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const decodedToken = await admin.auth().verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch (error) {
    console.error('Auth verification failed:', error)
    return res.status(401).json({ error: 'Invalid or expired authentication session.' })
  }
}
