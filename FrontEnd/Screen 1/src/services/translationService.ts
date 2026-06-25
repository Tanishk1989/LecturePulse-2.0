import { apiFetch } from '@/lib/api'

export async function translateContent(
  text: string,
  targetLanguage: string,
  contextLabel?: string,
): Promise<string> {
  const data = await apiFetch<{ translated: string }>('/ai/translate', {
    method: 'POST',
    body: JSON.stringify({ text, targetLanguage, contextLabel }),
  })
  return data.translated
}

export async function retrieveRagContext(
  question: string,
  lectureIds: string[],
  topK = 6,
): Promise<Array<{ text: string; lectureId: string; lectureTitle: string; score: number }>> {
  const data = await apiFetch<{
    chunks: Array<{ text: string; lectureId: string; lectureTitle: string; score: number }>
  }>('/ai/rag-retrieve', {
    method: 'POST',
    body: JSON.stringify({ question, lectureIds, topK }),
  })
  return data.chunks ?? []
}
