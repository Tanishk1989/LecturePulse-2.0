import { useCallback, useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'
import { generateConceptQuiz, type QuizQuestion } from '@/services/aiGenerationService'
import { saveConceptQuizAttempt } from '@/services/knowledgeGraphService'
import { getTranscriptByLectureId } from '@/services/transcriptService'
import type { KnowledgeGraphNode } from '@/services/knowledgeGraphService'
import type { QuizDifficulty } from '@/lib/quizDifficulty'

function masteryToDifficulty(node: KnowledgeGraphNode): QuizDifficulty {
  if (node.mastery === null || node.mastery < 40) return 'easy'
  if (node.mastery >= 70) return 'hard'
  return 'medium'
}

interface ConceptQuizDialogProps {
  node: KnowledgeGraphNode
  onClose: () => void
  onComplete: () => void
}

export function ConceptQuizDialog({ node, onClose, onComplete }: ConceptQuizDialogProps) {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const loadQuiz = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const transcript = await getTranscriptByLectureId(user.uid, node.lectureId)
      const text = transcript?.fullText ?? ''
      if (!text.trim()) {
        toast.error('No transcript available for this lecture.')
        onClose()
        return
      }

      const quizDifficulty = masteryToDifficulty(node)
      const quiz = await generateConceptQuiz(node.name, node.description, text, 4, quizDifficulty)
      if (quiz.length === 0) {
        toast.error('Could not generate quiz questions for this concept.')
        onClose()
        return
      }
      setQuestions(quiz)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Quiz generation failed.')
      onClose()
    } finally {
      setLoading(false)
    }
  }, [node.description, node.lectureId, node.name, onClose, toast, user])

  useEffect(() => {
    void loadQuiz()
  }, [loadQuiz])

  const current = questions[currentIndex]

  const handleSubmitAnswer = async () => {
    if (!current || !selected || !user) return

    const isCorrect = selected === current.correctAnswer
    if (isCorrect) setScore((s) => s + 1)
    setRevealed(true)

    try {
      await saveConceptQuizAttempt({
        conceptId: node.id,
        lectureId: node.lectureId,
        question: current.question,
        selectedAnswer: selected,
        correctAnswer: current.correctAnswer,
        isCorrect,
      })
    } catch {
      // Non-blocking — mastery will refresh on next graph load
    }
  }

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setFinished(true)
      onComplete()
      return
    }
    setCurrentIndex((i) => i + 1)
    setSelected(null)
    setRevealed(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl question-card',
          'p-6 max-h-[90vh] overflow-y-auto',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quiz"
          className="absolute right-4 top-4 text-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="font-heading text-xl text-foreground pr-8">Quiz: {node.name}</h3>
        <p className="mt-1 text-sm text-muted">Focused questions on this concept only.</p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted">Generating questions…</p>
          </div>
        ) : finished ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-2xl font-heading text-foreground">
              {score} / {questions.length}
            </p>
            <p className="text-sm text-muted">Your mastery score will update on the graph.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-background cursor-pointer hover:bg-accent-soft"
            >
              Done
            </button>
          </div>
        ) : current ? (
          <div className="mt-6 space-y-4">
            <p className="text-xs text-muted">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{current.question}</p>

            <div className="space-y-2">
              {current.options.map((option) => {
                const isSelected = selected === option
                const isCorrect = option === current.correctAnswer
                let optionClass = 'border-border bg-[var(--bg-soft)] hover:border-accent/30'

                if (revealed && isCorrect) {
                  optionClass = 'border-emerald-500/50 bg-emerald-500/10'
                } else if (revealed && isSelected && !isCorrect) {
                  optionClass = 'border-red/50 bg-red/10'
                } else if (isSelected) {
                  optionClass = 'border-accent/40 bg-accent/10'
                }

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={revealed}
                    onClick={() => setSelected(option)}
                    className={cn(
                      'w-full rounded-xl border px-4 py-3 text-left text-sm text-foreground transition-colors cursor-pointer',
                      'disabled:cursor-default',
                      optionClass,
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {revealed && current.explanation && (
              <p className="text-xs text-muted leading-relaxed border-t border-border pt-3">
                {current.explanation}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {!revealed ? (
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => void handleSubmitAnswer()}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-background cursor-pointer hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Check answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-background cursor-pointer hover:bg-accent-soft"
                >
                  {currentIndex >= questions.length - 1 ? 'Finish' : 'Next question'}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
