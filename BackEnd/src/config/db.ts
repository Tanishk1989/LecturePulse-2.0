import { PrismaClient } from '@prisma/client'

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim()

  if (!raw) {
    throw new Error(
      'DATABASE_URL is not set. Add your Supabase Postgres URI to BackEnd/.env (local) or Render environment variables.',
    )
  }

  let url = raw

  // Supabase transaction pooler (port 6543) requires pgbouncer mode for Prisma.
  if (url.includes(':6543/') && !url.includes('pgbouncer=')) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}pgbouncer=true`
  }

  // Supabase requires SSL when omitted from the connection URI.
  if (!url.includes('sslmode=')) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}sslmode=require`
  }

  if (!url.includes('connect_timeout=')) {
    const separator = url.includes('?') ? '&' : '?'
    url = `${url}${separator}connect_timeout=30`
  }

  return url
}

const databaseUrl = resolveDatabaseUrl()

export const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
})
