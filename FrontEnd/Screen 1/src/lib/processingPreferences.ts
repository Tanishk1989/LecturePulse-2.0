import { loadUserPreferences } from '@/lib/userPreferences'
import type { UserPreferences } from '@/types/userPreferences'

export function getTranscriptionLanguagePreference(userId: string): string | undefined {
  const lang = loadUserPreferences(userId).ai.transcriptionLanguage
  if (!lang || lang === 'auto') return undefined
  return lang
}

export function getOutputLanguagePreference(userId: string): UserPreferences['ai']['outputLanguage'] {
  return loadUserPreferences(userId).ai.outputLanguage === 'match' ? 'match' : 'en'
}

export function getProcessingOptions(userId: string): {
  transcriptionLanguage?: string
  outputLanguage?: UserPreferences['ai']['outputLanguage']
} {
  const transcriptionLanguage = getTranscriptionLanguagePreference(userId)
  const outputLanguage = getOutputLanguagePreference(userId)
  return {
    ...(transcriptionLanguage ? { transcriptionLanguage } : {}),
    outputLanguage,
  }
}
