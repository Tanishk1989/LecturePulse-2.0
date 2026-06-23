const DB_UNAVAILABLE_MESSAGE =
  'Unable to connect to the database. Your Supabase project may be paused — open the Supabase dashboard, resume the project, and verify DATABASE_URL in BackEnd/.env.'

const GENERIC_SERVER_MESSAGE = 'Something went wrong on our end. Please try again in a moment.'

export function sanitizeApiErrorMessage(message: string, code?: string): string {
  if (code === 'DB_UNAVAILABLE') {
    return DB_UNAVAILABLE_MESSAGE
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
  return code === 'DB_UNAVAILABLE' || sanitizeApiErrorMessage(message, code) === DB_UNAVAILABLE_MESSAGE
}
