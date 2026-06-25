import { apiFetch } from '@/lib/api'
import type { QuizDifficulty } from '@/lib/quizDifficulty'

export interface LectureQuizAttempt {
  id: string
  lectureId: string
  question: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  difficulty: string
  createdAt: string
}

export async function getLectureQuizAttempts(lectureId: string): Promise<LectureQuizAttempt[]> {
  const data = await apiFetch<{ attempts: LectureQuizAttempt[] }>(
    `/knowledge-graph/lecture-quiz-attempts/${lectureId}`,
  )
  return data.attempts ?? []
}

export async function saveLectureQuizAttempt(input: {
  lectureId: string
  question: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  difficulty: QuizDifficulty
}): Promise<void> {
  await apiFetch('/knowledge-graph/lecture-quiz-attempts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
