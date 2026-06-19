import { AuthError, requireUserId } from './auth.ts'
import { handleOptions, jsonResponse } from './cors.ts'
import { checkRateLimit } from './rateLimit.ts'
import { createAdminClient } from './supabaseAdmin.ts'

type HandlerFn = (req: Request, userId: string) => Promise<Response>

export function serveProtectedFunction(
  functionName: string,
  maxPerHour: number,
  handler: HandlerFn,
): void {
  Deno.serve(async (req) => {
    const options = handleOptions(req)
    if (options) return options

    try {
      const userId = await requireUserId(req)
      const admin = createAdminClient()
      const allowed = await checkRateLimit(admin, userId, functionName, maxPerHour)

      if (!allowed) {
        return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429)
      }

      return await handler(req, userId)
    } catch (error) {
      if (error instanceof AuthError) {
        return jsonResponse({ error: error.message }, 401)
      }

      const message = error instanceof Error ? error.message : 'Request failed.'
      return jsonResponse({ error: message }, 500)
    }
  })
}

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void
}

export function runInBackground(task: Promise<unknown>): void {
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(task)
    return
  }

  task.catch((error) => {
    console.error('Background task failed:', error)
  })
}
