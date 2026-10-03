import { prisma } from '../config/db'
import { chunkTranscript, rankChunks } from './lexicalRetrieval'

export async function indexLectureRag(lectureId: string, userId: string, transcript: string): Promise<number> {
  const lecture = await prisma.lecture.findFirst({ where: { id: lectureId, userId }, select: { id: true } })
  if (!lecture) return 0
  const chunks = chunkTranscript(transcript)
  // Atomic replacement preserves the old index if any write fails.
  await prisma.$transaction(async tx => {
    await tx.ragChunk.deleteMany({ where: { lectureId, userId } })
    if (chunks.length) await tx.ragChunk.createMany({
      data: chunks.map((text, chunkIndex) => ({ lectureId, userId, chunkIndex, text, embedding: [] })),
    })
  })
  return chunks.length
}

export async function retrieveRagChunks(userId: string, question: string, lectureIds: string[], topK = 6) {
  if (!question.trim() || !lectureIds.length) return []
  // Current transcripts also recover lectures whose old embedding index failed.
  // Check both transcript and parent ownership; caller-supplied IDs are untrusted.
  const transcripts = await prisma.transcript.findMany({
    where: {
      userId, status: 'completed', lectureId: { in: [...new Set(lectureIds)].slice(0, 10) },
      lecture: { userId },
    },
    select: { lectureId: true, fullText: true, lecture: { select: { title: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  const seen = new Set<string>()
  return rankChunks(question, transcripts.flatMap(transcript => {
    if (seen.has(transcript.lectureId)) return []
    seen.add(transcript.lectureId)
    return chunkTranscript(transcript.fullText).map(text => ({
      text, lectureId: transcript.lectureId, lectureTitle: transcript.lecture.title,
    }))
  }), topK)
}
