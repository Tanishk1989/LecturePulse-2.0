import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { useLectures } from '@/hooks/useLectures'
import { AI_UNAVAILABLE_MESSAGE, isAiGenerationConfigured } from '@/services/aiGenerationService'
import {
  askTutorQuestionStream,
  buildTutorContext,
  type TutorMessage,
} from '@/services/aiTutorService'

const PROCESSING_MESSAGE =
  "This lecture's notes are still processing — try asking again in a moment."

export function getRouteLectureId(pathname: string): string | null {
  const match = pathname.match(/^\/(?:notes|transcript)\/([^/]+)/)
  return match?.[1] ?? null
}

function getContextLabel(lectureId: string | null, lectures: { id: string; title: string }[]): string {
  if (!lectureId) return 'All Lectures'
  return lectures.find((l) => l.id === lectureId)?.title ?? 'Selected lecture'
}

interface AiTutorContextValue {
  messages: TutorMessage[]
  loading: boolean
  hasContext: boolean | null
  selectedLectureId: string | null
  contextHighlighted: boolean
  syncFromRoute: (lectureId: string | null) => void
  setSelectedLectureIdManual: (id: string | null) => void
  ask: (question: string) => Promise<void>
  clearMessages: () => void
  retryTutorQuestion: (messageIndex: number) => Promise<void>
}

const AiTutorContext = createContext<AiTutorContextValue | null>(null)

export function AiTutorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { lectures } = useLectures()

  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [hasContext, setHasContext] = useState<boolean | null>(null)
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [contextHighlighted, setContextHighlighted] = useState(false)

  const contextRef = useRef<string | null>(null)
  const loadingContextRef = useRef(false)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevLectureIdRef = useRef<string | null>(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const loadedTopicIdRef = useRef<string | null>(null)

  // Load messages from localStorage when selectedLectureId or user changes
  useEffect(() => {
    if (!user) {
      setMessages([])
      loadedTopicIdRef.current = null
      return
    }
    const topicId = selectedLectureId || 'all'
    const storageKey = `lecturepulse:tutor:history:${user.uid}:${topicId}`
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as TutorMessage[]
        const sanitized = parsed.map((m) => ({
          ...m,
          isStreaming: false,
        }))
        setMessages(sanitized)
      } catch (e) {
        console.error('Failed to load tutor history:', e)
        setMessages([])
      }
    } else {
      setMessages([])
    }
    loadedTopicIdRef.current = topicId
  }, [selectedLectureId, user])

  // Save messages to localStorage when they change
  useEffect(() => {
    if (!user) return
    const topicId = selectedLectureId || 'all'
    
    // Only save if the messages state matches the currently loaded topic context
    if (topicId !== loadedTopicIdRef.current) return

    const storageKey = `lecturepulse:tutor:history:${user.uid}:${topicId}`
    if (messages.length > 0) {
      const clean = messages.map((m) => ({
        role: m.role,
        content: m.content,
        hasError: m.hasError,
      }))
      localStorage.setItem(storageKey, JSON.stringify(clean))
    } else {
      localStorage.removeItem(storageKey)
    }
  }, [messages, selectedLectureId, user])

  const flashContext = useCallback(() => {
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    setContextHighlighted(true)
    highlightTimerRef.current = setTimeout(() => {
      setContextHighlighted(false)
      highlightTimerRef.current = null
    }, 200)
  }, [])

  const appendContextNotice = useCallback(
    (lectureId: string | null) => {
      const label = getContextLabel(lectureId, lectures)
      setMessages((prev) => [
        ...prev,
        { role: 'context-notice', content: `Context updated to "${label}"` },
      ])
    },
    [lectures],
  )

  const applyLectureSelection = useCallback(
    (lectureId: string | null, options: { auto: boolean; preserveMessages: boolean }) => {
      const changed = prevLectureIdRef.current !== lectureId
      prevLectureIdRef.current = lectureId
      setSelectedLectureId(lectureId)

      if (!changed) return

      if (options.auto) {
        flashContext()
        if (options.preserveMessages && messagesRef.current.length > 0) {
          appendContextNotice(lectureId)
        }
      }
    },
    [appendContextNotice, flashContext],
  )

  const syncFromRoute = useCallback(
    (lectureId: string | null) => {
      applyLectureSelection(lectureId, { auto: true, preserveMessages: true })
    },
    [applyLectureSelection],
  )

  const setSelectedLectureIdManual = useCallback(
    (id: string | null) => {
      applyLectureSelection(id, { auto: false, preserveMessages: false })
    },
    [applyLectureSelection],
  )

  const ensureContext = useCallback(async (): Promise<string> => {
    if (contextRef.current !== null) {
      return contextRef.current
    }

    if (loadingContextRef.current) {
      while (loadingContextRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
      return contextRef.current ?? ''
    }

    if (!user) return ''

    loadingContextRef.current = true
    try {
      const activeLectures = selectedLectureId
        ? lectures.filter((l) => l.id === selectedLectureId)
        : lectures

      const context = await buildTutorContext(user.uid, activeLectures)
      contextRef.current = context
      setHasContext(Boolean(context.trim()))
      return context
    } finally {
      loadingContextRef.current = false
    }
  }, [lectures, user, selectedLectureId])

  useEffect(() => {
    contextRef.current = null
    setHasContext(null)
  }, [lectures, user?.uid, selectedLectureId])

  useEffect(() => {
    if (!user || lectures.length === 0) return
    void ensureContext()
  }, [ensureContext, lectures.length, user])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (!trimmed || loading) return

      if (!isAiGenerationConfigured()) {
        toast.error(AI_UNAVAILABLE_MESSAGE)
        return
      }

      if (!user) {
        toast.error('Sign in to use the AI tutor.')
        return
      }

      const history = messages.filter((m) => m.role !== 'context-notice')
      setLoading(true)

      // Append user message and empty assistant message placeholder
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '', isStreaming: true }
      ])

      try {
        if (selectedLectureId) {
          const lecture = lectures.find((l) => l.id === selectedLectureId)
          if (lecture && (lecture.status === 'processing' || lecture.status === 'uploaded')) {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                last.content = PROCESSING_MESSAGE
                last.isStreaming = false
              }
              return next
            })
            return
          }
        }

        const context = await ensureContext()
        if (!context.trim()) {
          if (selectedLectureId) {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                last.content = PROCESSING_MESSAGE
                last.isStreaming = false
              }
              return next
            })
          } else {
            setMessages((prev) => prev.slice(0, -2))
            toast.error('No lecture content found. Record or upload a lecture first.')
          }
          return
        }

        let accumulated = ''
        await askTutorQuestionStream(trimmed, context, history, (chunk) => {
          accumulated += chunk
          setMessages((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && last.role === 'assistant') {
              last.content = accumulated
            }
            return next
          })
        })

        // Done streaming successfully
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            last.isStreaming = false
          }
          return next
        })

      } catch (error) {
        // Interruption or error
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last && last.role === 'assistant') {
            const errorSuffix = last.content
              ? '\n\n*(Connection lost. Please try again.)*'
              : 'Connection lost. Please try again.'
            last.content = last.content + errorSuffix
            last.isStreaming = false
            last.hasError = true
          }
          return next
        })
        toast.error(error instanceof Error ? error.message : 'AI tutor request failed.')
      } finally {
        setLoading(false)
      }
    },
    [ensureContext, lectures, loading, messages, selectedLectureId, toast, user],
  )

  const retryTutorQuestion = useCallback(
    async (messageIndex: number) => {
      const questionMsg = messagesRef.current[messageIndex - 1]
      if (!questionMsg || questionMsg.role !== 'user') return

      // Remove the failed message and the question message
      setMessages((prev) => {
        const next = [...prev]
        next.splice(messageIndex - 1, 2)
        return next
      })

      // Ask again
      await ask(questionMsg.content)
    },
    [ask],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const value = useMemo(
    () => ({
      messages,
      loading,
      hasContext,
      selectedLectureId,
      contextHighlighted,
      syncFromRoute,
      setSelectedLectureIdManual,
      ask,
      clearMessages,
      retryTutorQuestion,
    }),
    [
      messages,
      loading,
      hasContext,
      selectedLectureId,
      contextHighlighted,
      syncFromRoute,
      setSelectedLectureIdManual,
      ask,
      clearMessages,
      retryTutorQuestion,
    ],
  )

  return <AiTutorContext.Provider value={value}>{children}</AiTutorContext.Provider>
}

export function useAiTutorContext() {
  const context = useContext(AiTutorContext)
  if (!context) {
    throw new Error('useAiTutorContext must be used within an AiTutorProvider')
  }
  return context
}
