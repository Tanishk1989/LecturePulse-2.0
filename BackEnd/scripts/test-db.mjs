import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const prisma = new PrismaClient()

try {
  await prisma.$queryRaw`SELECT 1`
  console.log('Database connection: OK')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Database connection: FAIL')
  console.error(message)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
