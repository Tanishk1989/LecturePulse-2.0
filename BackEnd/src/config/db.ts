import { PrismaClient } from '@prisma/client'

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()

  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add your Supabase Postgres URI to Render environment variables.',
    )
  }

  // Supabase requires SSL; append if the Connect URI omits it.
  if (!raw.includes('sslmode=')) {
    const separator = raw.includes('?') ? '&' : '?'
    return `${raw}${separator}sslmode=require`
  }

  return raw
}

const databaseUrl = resolveDatabaseUrl()

export const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
})
