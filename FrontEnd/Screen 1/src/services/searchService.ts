import { apiFetch } from '@/lib/api'

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

export interface SearchResponse {
  results: SearchResult[]
  query: string
}

export async function searchLectures(query: string, limit = 40): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query.trim(),
    limit: String(limit),
  })
  return apiFetch<SearchResponse>(`/search?${params.toString()}`)
}

export async function getUserTags(): Promise<string[]> {
  const data = await apiFetch<{ tags: string[] }>('/search/tags')
  return data.tags ?? []
}

export const SEARCH_FIELD_LABELS: Record<SearchMatchField, string> = {
  title: 'Title',
  subject: 'Subject',
  tag: 'Tag',
  transcript: 'Transcript',
  summary: 'Summary',
  concept: 'Key concept',
  definition: 'Definition',
}
