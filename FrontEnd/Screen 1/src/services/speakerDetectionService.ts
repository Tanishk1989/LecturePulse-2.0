import { apiFetch } from '@/lib/api'
import type { TranscriptSegment } from '@/types/transcript'

export async function detectSpeakers(
  segments: TranscriptSegment[],
  options?: { subject?: string; useLlm?: boolean },
): Promise<TranscriptSegment[]> {
  if (segments.length === 0) return []

  const data = await apiFetch<{ segments: TranscriptSegment[] }>('/ai/detect-speakers', {
    method: 'POST',
    body: JSON.stringify({
      segments,
      subject: options?.subject,
      useLlm: options?.useLlm,
    }),
  })

  return data.segments ?? segments
}
