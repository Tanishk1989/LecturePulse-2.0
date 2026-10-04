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
  } catch (error) {
    // Only SDK classification codes are logged; never tokens, claims or provider messages.
    const candidate=(error as {code?:unknown})?.code
    const code=typeof candidate==='string' && /^auth\/[a-z-]+$/.test(candidate)?candidate:'unclassified'
    console.warn(`Auth verification failed (${code}); session rejected.`)
    return res.status(401).json({ error: 'Invalid or expired authentication session.' })
  }
}
