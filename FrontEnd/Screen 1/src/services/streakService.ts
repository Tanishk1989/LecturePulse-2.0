import { apiFetch } from '@/lib/api'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  freezeCount: number
  weeklyGoalDays: number
  hasMissedYesterday: boolean
  sessions: Record<string, number>
  frozenDates: string[]
  history: string[]
}

export async function getStreakData(): Promise<StreakData> {
  const timezoneOffset = new Date().getTimezoneOffset()
  return apiFetch<StreakData>(`/streaks?timezoneOffset=${timezoneOffset}`)
}

export async function recordStudySession(lectureId: string, durationSeconds: number): Promise<{ success: boolean }> {
  const timezoneOffset = new Date().getTimezoneOffset()
  return apiFetch<{ success: boolean }>('/streaks/session', {
    method: 'POST',
    body: JSON.stringify({ lectureId, duration: durationSeconds, timezoneOffset }),
  })
}

export async function useStreakFreeze(): Promise<{ success: boolean }> {
  const timezoneOffset = new Date().getTimezoneOffset()
  return apiFetch<{ success: boolean }>('/streaks/use-freeze', {
    method: 'POST',
    body: JSON.stringify({ timezoneOffset }),
  })
}

export async function letGoStreak(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/streaks/let-go', {
    method: 'POST',
  })
}
