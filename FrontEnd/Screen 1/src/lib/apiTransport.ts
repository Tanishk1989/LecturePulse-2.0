export class ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function requestApiResponse(url: string, options: RequestInit = {}, timeoutMs = 120_000): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  try {
    // Do not retry writes automatically: an interrupted upload/save may already have succeeded.
    return await fetch(url, { ...options, signal })
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (timeout.aborted || (error instanceof Error && error.name === 'TimeoutError')) {
      throw new ApiError('The server took too long to respond. Your data is safe; please try again shortly.', 0, 'API_TIMEOUT')
    }
    throw new ApiError('Cannot reach LecturePulse right now. Check your connection and try again.', 0, 'API_UNAVAILABLE')
  }
}
