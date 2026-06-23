import { Response } from 'express'
import { Prisma } from '@prisma/client'

export interface ResolvedApiError {
  status: number
  message: string
  code: string
}

function isDbConnectivityMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("can't reach database server") ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('connection timed out') ||
    lower.includes('password authentication failed') ||
    lower.includes('the database server is not accepting connections')
  )
}

export function resolveApiError(error: unknown, fallback: string): ResolvedApiError {
  const raw = error instanceof Error ? error.message : String(error)

  if (error instanceof Prisma.PrismaClientInitializationError || isDbConnectivityMessage(raw)) {
    return {
      status: 503,
      code: 'DB_UNAVAILABLE',
      message:
        'Database is unavailable. If you use Supabase, open your project dashboard and resume the database, then verify DATABASE_URL in BackEnd/.env.',
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code)) {
      return {
        status: 503,
        code: 'DB_UNAVAILABLE',
        message:
          'Database is unavailable. If you use Supabase, open your project dashboard and resume the database, then verify DATABASE_URL in BackEnd/.env.',
      }
    }
  }

  if (raw.includes('Invalid `prisma.') || raw.toLowerCase().includes('prisma')) {
    console.error('[API] Unhandled Prisma error:', raw)
    return {
      status: 500,
      code: 'SERVER_ERROR',
      message: fallback,
    }
  }

  return {
    status: 500,
    code: 'SERVER_ERROR',
    message: fallback,
  }
}

export function getSafeErrorMessage(error: unknown, fallback: string): string {
  return resolveApiError(error, fallback).message
}

export function sendRouteError(res: Response, error: unknown, fallback: string): Response {
  const resolved = resolveApiError(error, fallback)
  console.error(`[API] ${fallback}`, error instanceof Error ? error.message : error)
  return res.status(resolved.status).json({
    error: resolved.message,
    code: resolved.code,
  })
}
