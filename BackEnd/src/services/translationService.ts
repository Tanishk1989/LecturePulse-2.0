import { groqChatCompletion } from './groq'

export async function translateText(
  text: string,
  targetLanguage: string,
  contextLabel = 'lecture content',
): Promise<string> {
  if (!text.trim()) return ''

  const languageNames: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese',
    ar: 'Arabic',
  }

  const target = languageNames[targetLanguage] ?? targetLanguage

  return groqChatCompletion(
    `You are a precise academic translator. Translate ${contextLabel} to ${target}. Preserve structure, headings, and bullet points. Return only the translation.`,
    text.slice(0, 120000),
    { temperature: 0.2, skipEnhancement: true },
  )
}
