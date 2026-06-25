import { prisma } from '../config/db'
import { cosineSimilarity, embedText, embedTexts } from './embeddingService'

const CHUNK_WORDS = 180
const CHUNK_OVERLAP = 40

function chunkTranscript(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const chunks: string[] = []
  let index = 0

  while (index < words.length) {
    const slice = words.slice(index, index + CHUNK_WORDS)
    chunks.push(slice.join(' '))
    if (index + CHUNK_WORDS >= words.length) break
    index += CHUNK_WORDS - CHUNK_OVERLAP
  }

  return chunks
}

export async function indexLectureRag(
  lectureId: string,
  userId: string,
  transcript: string,
): Promise<number> {
  const chunks = chunkTranscript(transcript)
  if (chunks.length === 0) return 0

  await prisma.ragChunk.deleteMany({ where: { lectureId, userId } })

  const batchSize = 16
  let stored = 0

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const embeddings = await embedTexts(batch)

    await prisma.ragChunk.createMany({
      data: batch.map((text, offset) => ({
        lectureId,
        userId,
        chunkIndex: i + offset,
        text,
        embedding: embeddings[offset] ?? [],
      })),
    })

    stored += batch.length
  }

  return stored
}

export async function retrieveRagChunks(
  userId: string,
  question: string,
  lectureIds: string[],
  topK = 6,
): Promise<Array<{ text: string; lectureId: string; lectureTitle: string; score: number }>> {
  if (!question.trim() || lectureIds.length === 0) return []

  const queryEmbedding = await embedText(question)

  const chunks = await prisma.ragChunk.findMany({
    where: {
      userId,
      lectureId: { in: lectureIds.slice(0, 10) },
    },
    include: {
      lecture: { select: { title: true } },
    },
  })

  if (chunks.length === 0) return []

  const scored = chunks
    .map((chunk) => {
      const embedding = Array.isArray(chunk.embedding) ? (chunk.embedding as number[]) : []
      return {
        text: chunk.text,
        lectureId: chunk.lectureId,
        lectureTitle: chunk.lecture.title,
        score: cosineSimilarity(queryEmbedding, embedding),
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}
