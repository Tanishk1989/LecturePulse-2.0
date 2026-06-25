import { apiFetch } from '@/lib/api'

export interface InstitutionAnalytics {
  meta: { anonymized: boolean; generatedAt: string }
  overview: {
    activeStudents: number
    completedLectures: number
    quizAttempts: number
  }
  confusingTopics: Array<{ concept: string; wrongCount: number; studentCount: number }>
  subjectsNeedingReview: Array<{ subject: string; reportCount: number }>
  popularConcepts: Array<{ concept: string; lectureCount: number }>
}

export async function fetchInstitutionAnalytics(): Promise<InstitutionAnalytics> {
  return apiFetch<InstitutionAnalytics>('/analytics/institution')
}
