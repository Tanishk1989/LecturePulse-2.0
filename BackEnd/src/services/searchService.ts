import { prisma } from '../config/db'

export type SearchMatchField =
  | 'title'
  | 'subject'
  | 'tag'
  | 'transcript'
  | 'summary'
  | 'concept'
  | 'definition'

export interface SearchMatch {
  field: SearchMatchField
  snippet: string
}

export interface SearchResult {
  lectureId: string
  lectureTitle: string
  subject: string | null
  tags: string[]
  matches: SearchMatch[]
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function extractSnippet(text: string, query: string, radius = 90): string {
  const normalized = text.trim()
  if (!normalized) return ''

  const lower = normalized.toLowerCase()
  const idx = lower.indexOf(query)
  if (idx === -1) {
    return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized
  }

  const start = Math.max(0, idx - radius)
  const end = Math.min(normalized.length, idx + query.length + radius)
  let snippet = normalized.slice(start, end)
  if (start > 0) snippet = `…${snippet}`
  if (end < normalized.length) snippet = `${snippet}…`
  return snippet
}

function pushMatch(
  map: Map<string, SearchResult>,
  lecture: { id: string; title: string; subject: string | null; tags: unknown },
  field: SearchMatchField,
  snippet: string,
) {
  const existing = map.get(lecture.id)
  const tags = parseTags(lecture.tags)
  const match: SearchMatch = { field, snippet }

  if (existing) {
    const duplicate = existing.matches.some(
      (item) => item.field === field && item.snippet === snippet,
    )
    if (!duplicate) existing.matches.push(match)
    return
  }

  map.set(lecture.id, {
    lectureId: lecture.id,
    lectureTitle: lecture.title,
    subject: lecture.subject,
    tags,
    matches: [match],
  })
}

function jsonTextIncludes(value: unknown, query: string): boolean {
  try {
    return JSON.stringify(value).toLowerCase().includes(query)
  } catch {
    return false
  }
}

export async function searchUserLectures(
  userId: string,
  rawQuery: string,
  limit = 40,
): Promise<SearchResult[]> {
  const query = normalizeQuery(rawQuery)
  if (!query) return []

  const lectures = await prisma.lecture.findMany({
    where: { userId },
    include: {
      transcripts: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      lectureNotes: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const resultMap = new Map<string, SearchResult>()

  for (const lecture of lectures) {
    if (lecture.title.toLowerCase().includes(query)) {
      pushMatch(resultMap, lecture, 'title', extractSnippet(lecture.title, query))
    }

    if (lecture.subject?.toLowerCase().includes(query)) {
      pushMatch(
        resultMap,
        lecture,
        'subject',
        extractSnippet(lecture.subject, query),
      )
    }

    for (const tag of parseTags(lecture.tags)) {
      if (tag.toLowerCase().includes(query)) {
        pushMatch(resultMap, lecture, 'tag', tag)
      }
    }

    const transcript = lecture.transcripts[0]
    if (transcript?.fullText.toLowerCase().includes(query)) {
      pushMatch(
        resultMap,
        lecture,
        'transcript',
        extractSnippet(transcript.fullText, query),
      )
    }

    const notes = lecture.lectureNotes[0]
    if (!notes) continue

    if (notes.summary?.toLowerCase().includes(query)) {
      pushMatch(
        resultMap,
        lecture,
        'summary',
        extractSnippet(notes.summary, query),
      )
    }

    if (jsonTextIncludes(notes.keyConcepts, query)) {
      const concepts = notes.keyConcepts as Array<{ title?: string; explanation?: string }>
      for (const concept of concepts) {
        const text = `${concept.title ?? ''} ${concept.explanation ?? ''}`.trim()
        if (text.toLowerCase().includes(query)) {
          pushMatch(resultMap, lecture, 'concept', extractSnippet(text, query))
          break
        }
      }
    }

    if (jsonTextIncludes(notes.definitions, query)) {
      const definitions = notes.definitions as Array<{ term?: string; definition?: string }>
      for (const def of definitions) {
        const text = `${def.term ?? ''} ${def.definition ?? ''}`.trim()
        if (text.toLowerCase().includes(query)) {
          pushMatch(resultMap, lecture, 'definition', extractSnippet(text, query))
          break
        }
      }
    }
  }

  return Array.from(resultMap.values()).slice(0, limit)
}

export async function getUserTags(userId: string): Promise<string[]> {
  const lectures = await prisma.lecture.findMany({
    where: { userId },
    select: { tags: true },
  })

  const tagSet = new Set<string>()
  for (const lecture of lectures) {
    for (const tag of parseTags(lecture.tags)) {
      tagSet.add(tag)
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b))
}
