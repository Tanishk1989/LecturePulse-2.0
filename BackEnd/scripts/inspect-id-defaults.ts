import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRaw<
    { table_name: string; column_name: string; column_default: string | null }[]
  >`
    SELECT table_name, column_name, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('lectures', 'transcripts', 'flashcards', 'kg_concepts')
      AND column_name = 'id'
    ORDER BY table_name
  `
  console.log(JSON.stringify(rows, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
