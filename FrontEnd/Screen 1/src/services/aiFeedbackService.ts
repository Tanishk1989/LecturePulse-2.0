import { apiFetch } from '@/lib/api'

export interface AiFeedbackInput {
  contentType: 'summary' | 'flashcard' | 'quiz' | 'quiz_question'
  contentId: string
  lectureId: string
  subject?: string | null
  feedback: 'positive' | 'negative'
}

export async function submitAiFeedback(input: AiFeedbackInput): Promise<{ success: boolean }> {
  return apiFetch('/ai/feedback', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
