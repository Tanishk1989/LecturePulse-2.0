import { apiFetch } from '@/lib/api'

export type MasteryTier = 'mastered' | 'learning' | 'weak' | 'untested'

export interface KnowledgeGraphNode {
  id: string
  name: string
  description: string
  lectureId: string
  lectureTitle: string
  mastery: number | null
  masteryTier: MasteryTier
  linkCount: number
  relatedLectureIds?: string[]
  relatedLectureTitles?: string[]
  x?: number
  y?: number
  radius?: number
}

export interface KnowledgeGraphLink {
  id: string
  fromConceptId: string
  toConceptId: string
  lectureId: string
  linkType?: 'intra' | 'cross'
}

export interface KnowledgeGraphResponse {
  nodes: KnowledgeGraphNode[]
  links: KnowledgeGraphLink[]
  meta: {
    hasLectures: boolean
    conceptCount: number
    extractingCount: number
    pendingExtraction: boolean
  }
}

export interface ConceptQuizAttemptInput {
  conceptId: string
  lectureId: string
  question: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export async function fetchKnowledgeGraph(): Promise<KnowledgeGraphResponse> {
  return apiFetch<KnowledgeGraphResponse>('/knowledge-graph')
}

export async function triggerConceptExtraction(lectureId: string): Promise<void> {
  await apiFetch(`/knowledge-graph/extract/${lectureId}`, { method: 'POST' })
}

export async function saveConceptQuizAttempt(input: ConceptQuizAttemptInput): Promise<void> {
  await apiFetch('/knowledge-graph/quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export const MASTERY_COLORS: Record<MasteryTier, { fill: string; stroke: string; text: string }> = {
  mastered: { fill: '#10B981', stroke: '#059669', text: '#ECFDF5' },
  learning: { fill: '#F59E0B', stroke: '#D97706', text: '#FFFBEB' },
  weak: { fill: '#EF4444', stroke: '#DC2626', text: '#FEF2F2' },
  untested: { fill: '#71717A', stroke: '#52525B', text: '#FAFAFA' },
}
