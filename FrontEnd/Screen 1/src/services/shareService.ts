import { apiFetch } from '@/lib/api'
import type { StructuredNotesContent } from '@/types/notes'

export interface ShareLinkResponse {
  shareToken: string
  shareUrl: string
  expiresAt: string | null
}

export interface SharedNotesResponse {
  lectureTitle: string
  subject: string | null
  allowMerge: boolean
  content: StructuredNotesContent & {
    importantPoints?: string[]
  }
  sharedAt: string
}

export async function createLectureShareLink(lectureId: string): Promise<ShareLinkResponse> {
  return apiFetch<ShareLinkResponse>(`/shares/lecture/${lectureId}`, { method: 'POST' })
}

export async function fetchSharedNotes(token: string): Promise<SharedNotesResponse> {
  return apiFetch<SharedNotesResponse>(`/shares/${token}`)
}

export async function mergeSharedNotes(
  token: string,
  targetLectureId: string,
): Promise<{ success: boolean; mergedCount: number }> {
  return apiFetch(`/shares/${token}/merge`, {
    method: 'POST',
    body: JSON.stringify({ targetLectureId }),
  })
}
