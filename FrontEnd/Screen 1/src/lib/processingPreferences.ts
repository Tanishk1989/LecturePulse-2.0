import { loadUserPreferences } from '@/lib/userPreferences'

export function getTranscriptionLanguagePreference(userId: string): string | undefined {
  const lang = loadUserPreferences(userId).ai.transcriptionLanguage
  if (!lang || lang === 'auto') return undefined
  return lang
}

export function getProcessingOptions(userId: string): {
  transcriptionLanguage?: string
} {
  const transcriptionLanguage = getTranscriptionLanguagePreference(userId)
  return transcriptionLanguage ? { transcriptionLanguage } : {}
}
