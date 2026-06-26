import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const raw = process.env.DATABASE_URL?.trim()
if (!raw) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const url = raw.includes('sslmode=') ? raw : `${raw}${raw.includes('?') ? '&' : '?'}sslmode=require`

const prisma = new PrismaClient({ datasources: { db: { url } } })

try {
  await prisma.$queryRaw`SELECT 1`
  console.log('DB OK')
  const count = await prisma.lecture.count()
  console.log('lectures table OK, count:', count)
} catch (error) {
  console.error('DB FAIL:', error.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
