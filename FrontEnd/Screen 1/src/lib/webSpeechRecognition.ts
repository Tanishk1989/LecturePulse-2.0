export type RecognitionLanguage = 'auto' | 'hi-IN' | 'en-US'

export type DetectedLanguageLabel =
  | 'Detecting…'
  | 'English'
  | 'Hindi'
  | 'Hindi + English'

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

export interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onaudiostart: ((event: Event) => void) | null
  onaudioend: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onstart: ((event: Event) => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition
  }
}

export function getSpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null
}

/** @deprecated Use `isSpeechRecognitionSupported` */
export const isOpenAiConfigured = isSpeechRecognitionSupported

function resolveLang(language: RecognitionLanguage): string {
  if (language === 'auto') return ''
  return language
}

export function detectLanguageFromText(text: string): DetectedLanguageLabel {
  const hasLatin = /[a-zA-Z]{3,}/.test(text)
  const hasDevanagari = /[\u0900-\u097F]/.test(text)

  if (hasDevanagari && hasLatin) return 'Hindi + English'
  if (hasDevanagari) return 'Hindi'
  if (hasLatin) return 'English'
  return 'Detecting…'
}

export interface SpeechRecognitionSessionOptions {
  language?: RecognitionLanguage
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onError?: (message: string) => void
  onStart?: () => void
  onEnd?: () => void
}

export class SpeechRecognitionSession {
  private readonly recognition: BrowserSpeechRecognition
  private readonly options: SpeechRecognitionSessionOptions
  private active = false
  private shouldRestart = false
  private paused = false

  constructor(options: SpeechRecognitionSessionOptions = {}) {
    this.options = options
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      throw new Error('Speech recognition is not supported in this browser.')
    }

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = resolveLang(options.language ?? 'auto')
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      if (interim.trim()) {
        this.options.onInterim?.(interim.trim())
      }
      if (final.trim()) {
        this.options.onFinal?.(final.trim())
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      this.options.onError?.(event.message || event.error)
    }

    recognition.onstart = () => {
      this.options.onStart?.()
    }

    recognition.onend = () => {
      if (this.shouldRestart && !this.paused) {
        try {
          recognition.start()
          return
        } catch {
          // already started or unavailable
        }
      }
      this.active = false
      this.options.onEnd?.()
    }

    this.recognition = recognition
  }

  start(): void {
    if (this.active) return
    this.shouldRestart = true
    this.paused = false
    this.active = true
    try {
      this.recognition.start()
    } catch {
      this.active = false
      throw new Error('Failed to start speech recognition.')
    }
  }

  pause(): void {
    this.paused = true
    this.shouldRestart = false
    try {
      this.recognition.stop()
    } catch {
      // ignore
    }
  }

  resume(): void {
    this.paused = false
    this.shouldRestart = true
    if (!this.active) {
      this.start()
    }
  }

  stop(): void {
    this.shouldRestart = false
    this.paused = false
    try {
      this.recognition.stop()
    } catch {
      // ignore
    }
    this.active = false
  }

  abort(): void {
    this.shouldRestart = false
    this.paused = false
    try {
      this.recognition.abort()
    } catch {
      // ignore
    }
    this.active = false
  }
}

export interface TranscribePlaybackOptions {
  language?: RecognitionLanguage
  onInterim?: (text: string) => void
  onProgress?: (progress: number) => void
}

export interface TranscribePlaybackResult {
  text: string
  language: string
  duration: number
  segments: { id: number; start: number; end: number; text: string }[]
}

/**
 * Play an audio URL and transcribe via Web Speech API while listening.
 * Requires microphone access; works natively in Chrome and Edge.
 */
export async function transcribeFromAudioUrl(
  url: string,
  options: TranscribePlaybackOptions = {},
): Promise<TranscribePlaybackResult> {
  if (!isSpeechRecognitionSupported()) {
    throw new Error('Speech recognition is not supported in this browser. Use Chrome or Edge.')
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.preload = 'auto'

    let finalText = ''
    let segmentId = 0
    const segments: TranscribePlaybackResult['segments'] = []
    let settled = false

    const finish = (mode: 'resolve' | 'reject', error?: Error) => {
      if (settled) return
      settled = true
      session.stop()
      audio.pause()

      if (mode === 'reject') {
        reject(error ?? new Error('Transcription failed.'))
        return
      }

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0
      const language = detectLanguageFromText(finalText)
      resolve({
        text: finalText,
        language: language === 'Detecting…' ? 'auto' : language,
        duration,
        segments,
      })
    }

    const session = new SpeechRecognitionSession({
      language: options.language ?? 'auto',
      onInterim: (text) => options.onInterim?.(text),
      onFinal: (text) => {
        const start = audio.currentTime
        const end = Math.max(start + 1, audio.currentTime)
        segments.push({
          id: segmentId,
          start,
          end,
          text,
        })
        segmentId += 1
        finalText = `${finalText} ${text}`.trim()
      },
      onError: (message) => finish('reject', new Error(message)),
      onEnd: () => {
        if (settled) return
        if (!audio.ended && audio.currentTime < audio.duration - 0.25) {
          try {
            session.start()
          } catch {
            // wait for ended event
          }
        }
      },
    })

    audio.addEventListener('timeupdate', () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      options.onProgress?.(Math.round((audio.currentTime / audio.duration) * 100))
    })

    audio.addEventListener('ended', () => finish('resolve'))
    audio.addEventListener('error', () => {
      finish('reject', new Error('Failed to load audio for transcription.'))
    })

    audio.src = url

    void audio
      .play()
      .then(() => session.start())
      .catch(() => {
        finish('reject', new Error('Failed to play audio for transcription.'))
      })
  })
}
