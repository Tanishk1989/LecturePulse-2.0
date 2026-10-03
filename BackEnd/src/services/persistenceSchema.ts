import { readFileSync } from 'node:fs'
import path from 'node:path'
import { prisma } from '../config/db'

// Additive, idempotent migration; no existing application tables or records are removed.
export async function initializePersistenceSchema() {
  const sql = readFileSync(path.join(__dirname, '../../prisma/migrations/durable_jobs_and_sync.sql'), 'utf8')
  await prisma.$transaction(async tx => {
    for (const statement of sql.split(';').map(part => part.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement)
    }
  }, { timeout: 30_000 })
}
