import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { useLectures } from '@/hooks/useLectures'
import { AI_UNAVAILABLE_MESSAGE, isAiGenerationConfigured } from '@/services/aiGenerationService'
import {
  askTutorQuestion,
  buildTutorContext,
  type TutorMessage,
} from '@/services/aiTutorService'

interface UseAiTutorResult {
  messages: TutorMessage[]
  loading: boolean
  hasContext: boolean | null
  ask: (question: string) => Promise<void>
  clearMessages: () => void
}

export function useAiTutor(): UseAiTutorResult {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { lectures } = useLectures()

  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [hasContext, setHasContext] = useState<boolean | null>(null)

  const contextRef = useRef<string | null>(null)
  const loadingContextRef = useRef(false)

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
      const context = await buildTutorContext(user.uid, lectures)
      contextRef.current = context
      setHasContext(Boolean(context.trim()))
      return context
    } finally {
      loadingContextRef.current = false
    }
  }, [lectures, user])

  useEffect(() => {
    contextRef.current = null
    setHasContext(null)
  }, [lectures, user?.uid])

  useEffect(() => {
    if (!user || lectures.length === 0) return
    void ensureContext()
  }, [ensureContext, lectures.length, user])

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

      const history = messages
      setLoading(true)
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])

      try {
        const context = await ensureContext()
        const answer = await askTutorQuestion(trimmed, context, history)
        setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
      } catch (error) {
        setMessages((prev) => prev.slice(0, -1))
        toast.error(error instanceof Error ? error.message : 'AI tutor request failed.')
      } finally {
        setLoading(false)
      }
    },
    [ensureContext, loading, messages, toast, user],
  )

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return {
    messages,
    loading,
    hasContext,
    ask,
    clearMessages,
  }
}
