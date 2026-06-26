export type SummaryStyle = 'concise' | 'detailed'

export interface UserPreferences {
  bio: string
  general: {
    language: string
    timezone: string
  }
  notifications: {
    notesReady: boolean
    weeklyDigest: boolean
    pushEnabled: boolean
  }
  ai: {
    summaryStyle: SummaryStyle
    transcriptionLanguage: string
    outputLanguage: 'en' | 'match'
  }
  lastSeenChangelogVersion: string
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  bio: '',
  general: {
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  notifications: {
    notesReady: true,
    weeklyDigest: false,
    pushEnabled: false,
  },
  ai: {
    summaryStyle: 'detailed',
    transcriptionLanguage: 'auto',
    outputLanguage: 'en',
  },
  lastSeenChangelogVersion: '',
}
