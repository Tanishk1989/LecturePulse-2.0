export class ProviderRateLimitError extends Error {
  readonly status = 429
  constructor(message: string, readonly retryAfterSeconds: number) {
    super(message)
    this.name = 'ProviderRateLimitError'
  }
}

export function providerRetryDelay(error: unknown): number | null {
  const data = error as {status?: number; headers?: Record<string, string> | Headers; retryAfterSeconds?: number}
  const message = error instanceof Error ? error.message : ''
  if (data?.status !== 429 && !/rate limit|429/i.test(message)) return null
  let seconds = data?.retryAfterSeconds
  const headers = data?.headers
  const raw = headers instanceof Headers ? headers.get('retry-after') : headers?.['retry-after']
  if (seconds === undefined && raw) {
    seconds = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : (Date.parse(raw) - Date.now()) / 1000
  }
  return Math.min(86_400, Math.max(60, Math.ceil(Number.isFinite(seconds) ? seconds! : 60)))
}
