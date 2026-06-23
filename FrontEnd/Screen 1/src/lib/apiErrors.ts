const DB_UNAVAILABLE_MESSAGE =
  'Unable to reach the database. Open the Supabase dashboard, resume the project if it is paused, and verify DATABASE_URL is set on Render.'

const DB_AUTH_FAILED_MESSAGE =
  'Database login failed. Reset your Supabase database password, copy the new connection URI, and update DATABASE_URL on Render.'

const GENERIC_SERVER_MESSAGE = 'Something went wrong on our end. Please try again in a moment.'

export function sanitizeApiErrorMessage(message: string, code?: string): string {
  if (code === 'DB_AUTH_FAILED') {
    return DB_AUTH_FAILED_MESSAGE
  }

  if (code === 'DB_UNAVAILABLE') {
    return DB_UNAVAILABLE_MESSAGE
  }

  const lower = message.toLowerCase()
  if (
    lower.includes('authentication failed') ||
    lower.includes('provided database credentials') ||
    lower.includes('password authentication failed')
  ) {
    return DB_AUTH_FAILED_MESSAGE
  }

  const lower = message.toLowerCase()

  if (
    lower.includes('invalid `prisma') ||
    lower.includes("can't reach database server") ||
    lower.includes('prisma.') ||
    lower.includes('econnrefused') ||
    lower.includes('connection refused')
  ) {
    return DB_UNAVAILABLE_MESSAGE
  }

  if (message.startsWith('Request failed:') && message.length < 80) {
    return GENERIC_SERVER_MESSAGE
  }

  return message
}

export function isDatabaseUnavailableError(message: string, code?: string): boolean {
  const sanitized = sanitizeApiErrorMessage(message, code)
  return (
    code === 'DB_UNAVAILABLE' ||
    code === 'DB_AUTH_FAILED' ||
    sanitized === DB_UNAVAILABLE_MESSAGE ||
    sanitized === DB_AUTH_FAILED_MESSAGE
  )
}
