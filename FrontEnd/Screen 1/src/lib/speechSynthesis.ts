/** Strip common markdown so TTS reads natural speech. */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' code block ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const english =
    voices.find((v) => v.lang.startsWith('en') && v.localService) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]
  return english ?? null
}

export interface SpeakOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: () => void
}

let activeUtterance: SpeechSynthesisUtterance | null = null

export function speakText(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSynthesisSupported()) {
    options.onEnd?.()
    return
  }

  const cleaned = stripMarkdownForSpeech(text)
  if (!cleaned) {
    options.onEnd?.()
    return
  }

  cancelSpeech()

  const utterance = new SpeechSynthesisUtterance(cleaned)
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1
  utterance.lang = 'en-US'

  const voice = pickVoice()
  if (voice) utterance.voice = voice

  utterance.onstart = () => options.onStart?.()
  utterance.onend = () => {
    if (activeUtterance === utterance) activeUtterance = null
    options.onEnd?.()
  }
  utterance.onerror = () => {
    if (activeUtterance === utterance) activeUtterance = null
    options.onError?.()
    options.onEnd?.()
  }

  activeUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.cancel()
  activeUtterance = null
}

export function pauseSpeech(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.pause()
}

export function resumeSpeech(): void {
  if (!isSpeechSynthesisSupported()) return
  window.speechSynthesis.resume()
}

export function isSpeechActive(): boolean {
  if (!isSpeechSynthesisSupported()) return false
  return window.speechSynthesis.speaking || window.speechSynthesis.pending
}
