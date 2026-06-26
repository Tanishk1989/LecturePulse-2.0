import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRaw<
    { table_name: string; column_name: string; data_type: string; udt_name: string }[]
  >`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name IN (
        'lectures', 'transcripts', 'flashcards', 'kg_concepts', 'kg_links',
        'study_sessions', 'lecture_notes', 'rag_chunks', 'lecture_quiz_attempts'
      )
      AND c.column_name IN ('id', 'lecture_id')
    ORDER BY c.table_name, c.column_name
  `
  console.log(JSON.stringify(rows, null, 2))

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('rag_chunks', 'lecture_quiz_attempts', 'kg_concepts', 'kg_links')
    ORDER BY tablename
  `
  console.log('EXISTING_TABLES:', JSON.stringify(tables))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
