import { apiFetch } from '@/lib/api'

export interface Exam {
  userId: string
  title: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface ExamCountdownData {
  exam: Exam | null
  durations: Record<string, { duration: number; subjects: string[] }> // local date -> study details
  currentStreak: number
  longestStreak: number
}

export async function getExamCountdownData(): Promise<ExamCountdownData> {
  const timezoneOffset = new Date().getTimezoneOffset()
  return apiFetch<ExamCountdownData>(`/exam-countdown?timezoneOffset=${timezoneOffset}`)
}

export async function setExamCountdown(title: string, date: string): Promise<Exam> {
  return apiFetch<Exam>('/exam-countdown', {
    method: 'POST',
    body: JSON.stringify({ title, date }),
  })
}

export async function deleteExamCountdown(): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>('/exam-countdown', {
    method: 'DELETE',
  })
}
