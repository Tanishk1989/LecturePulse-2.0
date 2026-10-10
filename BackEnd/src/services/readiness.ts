import type { RequestHandler } from 'express'
import { resolveApiError } from '../utils/apiError'

export function createReadiness() {
  let ready = false
  let failure = { code: 'SERVICE_STARTING', message: 'The service is starting. Please try again shortly.' }
  return {
    isReady: () => ready,
    failure: () => ({ ...failure }),
    markReady: () => { ready = true },
    markFailed: (error: unknown) => {
      ready = false
      const resolved = resolveApiError(error, 'Service initialization failed. Please contact the site administrator.')
      failure = { code: resolved.code, message: resolved.message }
    },
    guard: ((req, res, next) => {
      if (ready || ['/health', '/health/db', '/live'].includes(req.path)) return next()
      res.setHeader('Retry-After', '30')
      res.status(503).json({ code: failure.code, error: failure.message })
    }) as RequestHandler,
  }
}
