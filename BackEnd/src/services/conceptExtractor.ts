import { groqChatCompletion } from './groq'
import { parseJsonFromAi } from '../utils/parseJsonFromAi'
import { prisma } from '../config/db'

export interface ExtractedConcept {
  name: string
  description: string
}

export interface ExtractedConceptLink {
  from: string
  to: string
}

export interface ConceptExtractionResult {
  concepts: ExtractedConcept[]
  links: ExtractedConceptLink[]
}

const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `You are an academic concept mapper for a lecture study app.
Identify the 5-10 most important distinct concepts covered in the lecture transcript.
For each concept, provide a short name (2-4 words) and a one-sentence description.
Also identify which concepts are directly related (one builds on another, or commonly discussed together).

Language Rule: All extracted concepts, names, and descriptions MUST always be in English, regardless of the language of the transcript. Do NOT respond in Hindi or Hinglish.

Return ONLY valid JSON matching this schema:
{
  "concepts": [{ "name": "string", "description": "string" }],
  "links": [{ "from": "string", "to": "string" }]
}

Use exact concept names in links. Do not wrap in markdown. Rely only on the transcript.`

export async function extractConcepts(transcript: string): Promise<ConceptExtractionResult> {
  if (!transcript.trim()) {
    return { concepts: [], links: [] }
  }

  const raw = await groqChatCompletion(
    CONCEPT_EXTRACTION_SYSTEM_PROMPT,
    `Lecture transcript:\n\n${transcript.slice(0, 120000)}`,
    { temperature: 0.3, jsonMode: true },
  )

  const parsed = parseJsonFromAi<ConceptExtractionResult>(raw)
  if (!parsed || !Array.isArray(parsed.concepts)) {
    return { concepts: [], links: [] }
  }

  const concepts = parsed.concepts
    .filter((c) => c?.name?.trim() && c?.description?.trim())
    .map((c) => ({
      name: c.name.trim(),
      description: c.description.trim(),
    }))

  const nameSet = new Set(concepts.map((c) => c.name.toLowerCase()))
  const links = (parsed.links ?? [])
    .filter(
      (l) =>
        l?.from?.trim() &&
        l?.to?.trim() &&
        nameSet.has(l.from.trim().toLowerCase()) &&
        nameSet.has(l.to.trim().toLowerCase()) &&
        l.from.trim().toLowerCase() !== l.to.trim().toLowerCase(),
    )
    .map((l) => ({ from: l.from.trim(), to: l.to.trim() }))

  return { concepts, links }
}

function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase()
}

export async function extractAndStoreConcepts(
  lectureId: string,
  userId: string,
  transcript: string,
): Promise<void> {
  await prisma.lecture.update({
    where: { id: lectureId },
    data: { kgStatus: 'extracting', updatedAt: new Date() },
  })

  try {
    const { concepts, links } = await extractConcepts(transcript)

    await prisma.$transaction(async (tx) => {
      await tx.kgLink.deleteMany({ where: { lectureId, userId } })
      await tx.kgConcept.deleteMany({ where: { lectureId, userId } })

      if (concepts.length === 0) {
        await tx.lecture.update({
          where: { id: lectureId },
          data: { kgStatus: 'completed', updatedAt: new Date() },
        })
        return
      }

      const createdConcepts = await Promise.all(
        concepts.map((concept) =>
          tx.kgConcept.create({
            data: {
              lectureId,
              userId,
              name: concept.name,
              description: concept.description,
            },
          }),
        ),
      )

      const idByName = new Map(
        createdConcepts.map((c) => [normalizeConceptName(c.name), c.id]),
      )

      const linkData = links
        .map((link) => {
          const fromId = idByName.get(normalizeConceptName(link.from))
          const toId = idByName.get(normalizeConceptName(link.to))
          if (!fromId || !toId || fromId === toId) return null
          return {
            lectureId,
            userId,
            fromConceptId: fromId,
            toConceptId: toId,
            linkType: 'intra',
          }
        })
        .filter(Boolean) as Array<{
        lectureId: string
        userId: string
        fromConceptId: string
        toConceptId: string
        linkType: string
      }>

      if (linkData.length > 0) {
        await tx.kgLink.createMany({ data: linkData })
      }

      await tx.lecture.update({
        where: { id: lectureId },
        data: { kgStatus: 'completed', updatedAt: new Date() },
      })
    })

    const { syncCrossLectureLinks } = await import('./crossLectureService')
    await syncCrossLectureLinks(userId)
  } catch (error) {
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { kgStatus: 'failed', updatedAt: new Date() },
    })
    throw error
  }
}

export async function resolveConceptIdForFlashcard(
  lectureId: string,
  conceptName: string | null | undefined,
): Promise<string | null> {
  if (!conceptName?.trim()) return null

  const concept = await prisma.kgConcept.findFirst({
    where: {
      lectureId,
      name: { equals: conceptName.trim(), mode: 'insensitive' },
    },
    select: { id: true },
  })

  return concept?.id ?? null
}
