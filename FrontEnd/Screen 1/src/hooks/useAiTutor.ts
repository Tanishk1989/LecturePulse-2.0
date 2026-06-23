import { useAiTutorContext } from '@/context/AiTutorContext'
import type { TutorMessage } from '@/services/aiTutorService'

interface UseAiTutorResult {
  messages: TutorMessage[]
  loading: boolean
  hasContext: boolean | null
  selectedLectureId: string | null
  contextHighlighted: boolean
  setSelectedLectureId: (id: string | null) => void
  ask: (question: string) => Promise<void>
  clearMessages: () => void
  retryTutorQuestion: (messageIndex: number) => Promise<void>
}

export function useAiTutor(): UseAiTutorResult {
  const {
    messages,
    loading,
    hasContext,
    selectedLectureId,
    contextHighlighted,
    setSelectedLectureIdManual,
    ask,
    clearMessages,
    retryTutorQuestion,
  } = useAiTutorContext()

  return {
    messages,
    loading,
    hasContext,
    selectedLectureId,
    contextHighlighted,
    setSelectedLectureId: setSelectedLectureIdManual,
    ask,
    clearMessages,
    retryTutorQuestion,
  }
}
