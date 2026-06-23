import { Response } from 'express'
import { Prisma } from '@prisma/client'

export interface ResolvedApiError {
  status: number
  message: string
  code: string
}

const DB_UNAVAILABLE_MESSAGE =
  'Database is unreachable. If you use Supabase, open the project dashboard, resume the project if paused, and verify DATABASE_URL on Render.'

const DB_AUTH_FAILED_MESSAGE =
  'Database login failed. In Supabase go to Project Settings → Database, reset the database password, copy the new URI connection string, and set it as DATABASE_URL on Render (URL-encode special characters in the password).'

function isDbAuthMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('authentication failed') ||
    lower.includes('password authentication failed') ||
    lower.includes('provided database credentials') ||
    lower.includes('invalid credentials')
  )
}

function isDbConnectivityMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("can't reach database server") ||
    lower.includes('connection refused') ||
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('connection timed out') ||
    lower.includes('the database server is not accepting connections')
  )
}

export function resolveApiError(error: unknown, fallback: string): ResolvedApiError {
  const raw = error instanceof Error ? error.message : String(error)

  if (isDbAuthMessage(raw)) {
    return {
      status: 503,
      code: 'DB_AUTH_FAILED',
      message: DB_AUTH_FAILED_MESSAGE,
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError || isDbConnectivityMessage(raw)) {
    return {
      status: 503,
      code: 'DB_UNAVAILABLE',
      message: DB_UNAVAILABLE_MESSAGE,
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P1000') {
      return {
        status: 503,
        code: 'DB_AUTH_FAILED',
        message: DB_AUTH_FAILED_MESSAGE,
      }
    }

    if (['P1001', 'P1002', 'P1017'].includes(error.code)) {
      return {
        status: 503,
        code: 'DB_UNAVAILABLE',
        message: DB_UNAVAILABLE_MESSAGE,
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
