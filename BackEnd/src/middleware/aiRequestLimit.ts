import { NextFunction, Response } from 'express'
import { AuthenticatedRequest } from './auth'

interface Options { requests?: number; globalRequests?: number; concurrent?: number; windowMs?: number; maxUsers?: number; now?: () => number }
// Process-local guard for the current single Render instance. Use a shared store before scaling out.
export function createAiRequestLimit(options: Options = {}) {
  const { requests = 12, globalRequests = 120, concurrent = 2, windowMs = 60_000, maxUsers = 10_000, now = Date.now } = options
  const users = new Map<string, { start: number; count: number; active: number }>()
  let globalStart = now(), globalCount = 0
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const uid = req.user?.uid
    if (!uid) return res.status(401).json({ error: 'Unauthorized' })
    const time = now()
    if (time >= globalStart + windowMs) {globalStart = time; globalCount = 0}
    let user = users.get(uid)
    if (!user && users.size >= maxUsers) {
      for (const [key, value] of users) if (!value.active && time >= value.start + windowMs) users.delete(key)
      if (users.size >= maxUsers) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000))
        return res.status(503).json({ error: 'AI service is busy. Please try again shortly.' })
      }
    }
    if (!user) {user = {start:time, count:0, active:0}; users.set(uid, user)}
    if (time >= user.start + windowMs) {user.start = time; user.count = 0}
    const retry = user.count >= requests ? Math.ceil((user.start + windowMs - time) / 1000)
      : globalCount >= globalRequests ? Math.ceil((globalStart + windowMs - time) / 1000)
      : user.active >= concurrent ? 1 : 0
    if (retry) {
      res.setHeader('Retry-After', Math.max(1, retry))
      return res.status(429).json({ error: 'AI request limit reached. Wait briefly before trying again.' })
    }
    user.count++; user.active++; globalCount++
    let released = false
    const release = () => {if (!released) {released = true; user!.active--}}
    res.once('finish', release)
    res.once('close', release)
    next()
  }
}

export const aiRequestLimit = createAiRequestLimit()
