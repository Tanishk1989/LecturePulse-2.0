import type { SpeakerRole } from '@/types/transcript'

export function classifySegmentHeuristic(text: string): SpeakerRole {
  const trimmed = text.trim()
  if (!trimmed) return 'unknown'

  const lower = trimmed.toLowerCase()

  const studentSignals = [
    /^(excuse me|sir|professor|teacher|ma'am|madam)\b/,
    /^(can you|could you|would you|what about|how about|i have a question)\b/,
    /^(why|how|what|when|where|is it true|does that mean)\b.{0,120}\?$/,
    /\?$/,
    /^(yes|no|okay|right|sure)\?$/,
    /^(sorry|wait|hang on|one more thing)\b/,
  ]

  const professorSignals = [
    /^(so|now|today|let's|we will|remember|note that|the key point|definition|therefore|thus|in summary)\b/,
    /^(first|second|third|next|finally|moving on)\b/,
  ]

  if (trimmed.length <= 90 && studentSignals.some((pattern) => pattern.test(lower))) {
    return 'student'
  }

  if (trimmed.length >= 120 && professorSignals.some((pattern) => pattern.test(lower))) {
    return 'professor'
  }

  if (trimmed.length >= 200) return 'professor'
  if (trimmed.length <= 50 && lower.includes('?')) return 'student'

  return 'unknown'
}
