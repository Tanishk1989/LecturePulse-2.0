import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  await prisma.$queryRaw`SELECT 1`
  console.log('DATABASE_OK')
} catch (error) {
  console.error('DATABASE_ERROR:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
