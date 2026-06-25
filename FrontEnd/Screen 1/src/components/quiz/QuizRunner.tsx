import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizQuestion } from '@/services/aiGenerationService'

interface QuizRunnerProps {
  title: string
  subtitle?: string
  loading: boolean
  loadingMessage?: string
  questions: QuizQuestion[]
  onClose: () => void
  onFinished?: (score: number, total: number) => void
  onAnswerChecked?: (args: {
    question: QuizQuestion
    selectedAnswer: string
    isCorrect: boolean
  }) => void | Promise<void>
}

export function QuizRunner({
  title,
  subtitle,
  loading,
  loadingMessage = 'Generating questions…',
  questions,
  onClose,
  onFinished,
  onAnswerChecked,
}: QuizRunnerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const current = questions[currentIndex]

  const handleSubmitAnswer = async () => {
    if (!current || !selected) return

    const isCorrect = selected === current.correctAnswer
    if (isCorrect) setScore((value) => value + 1)
    setRevealed(true)

    try {
      await onAnswerChecked?.({
        question: current,
        selectedAnswer: selected,
        isCorrect,
      })
    } catch {
      // Non-blocking
    }
  }

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setFinished(true)
      onFinished?.(score, questions.length)
      return
    }
    setCurrentIndex((index) => index + 1)
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

        <h3 className="font-heading text-xl text-foreground pr-8">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted">{loadingMessage}</p>
          </div>
        ) : finished ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-2xl font-heading text-foreground">
              {score} / {questions.length}
            </p>
            <p className="text-sm text-muted">Great work — keep reviewing to lock it in.</p>
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
              {current.concept ? ` · ${current.concept}` : ''}
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
        ) : (
          <p className="py-10 text-center text-sm text-muted">No questions available.</p>
        )}
      </div>
    </div>
  )
}
