import {
  DEFAULT_USER_PREFERENCES,
  type UserPreferences,
} from '@/types/userPreferences'

const STORAGE_PREFIX = 'lecturepulse:prefs:'

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

export function loadUserPreferences(userId: string): UserPreferences {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { ...DEFAULT_USER_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...parsed,
      general: { ...DEFAULT_USER_PREFERENCES.general, ...parsed.general },
      notifications: { ...DEFAULT_USER_PREFERENCES.notifications, ...parsed.notifications },
      ai: { ...DEFAULT_USER_PREFERENCES.ai, ...parsed.ai },
    }
  } catch {
    return { ...DEFAULT_USER_PREFERENCES }
  }
}

export function saveUserPreferences(userId: string, preferences: UserPreferences): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
}

export function clearUserPreferences(userId: string): void {
  localStorage.removeItem(storageKey(userId))
}
