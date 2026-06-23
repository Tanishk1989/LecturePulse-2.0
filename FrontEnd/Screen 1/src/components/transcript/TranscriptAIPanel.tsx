import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { isAiGenerationConfigured, AI_UNAVAILABLE_MESSAGE } from '@/services/aiGenerationService'
import { askAboutTranscript } from '@/services/aiTutorService'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'

const SUGGESTIONS = [
  'Explain this',
  'Summarize section',
  'Generate flashcards',
  'Show weak areas',
  'Help me revise',
] as const

export interface TranscriptAIPanelHandle {
  askQuestion: (question: string) => Promise<void>
}

interface TranscriptAIPanelProps {
  draft: string
  onDraftChange: (value: string) => void
  transcriptText: string | null
  className?: string
  onClose?: () => void
}

export const TranscriptAIPanel = forwardRef<TranscriptAIPanelHandle, TranscriptAIPanelProps>(
  function TranscriptAIPanel({ draft, onDraftChange, transcriptText, className, onClose }, ref) {
    const { toast } = useToast()
    const prefersReducedMotion = useReducedMotion()
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const panelRef = useRef<HTMLElement>(null)

    const [loading, setLoading] = useState(false)
    const [answer, setAnswer] = useState<string | null>(null)
    const [lastQuestion, setLastQuestion] = useState<string | null>(null)

    useEffect(() => {
      if (!prefersReducedMotion) {
        inputRef.current?.focus()
      }
    }, [prefersReducedMotion])

    const submitQuestion = useCallback(
      async (question: string) => {
        const trimmed = question.trim()
        if (!trimmed || loading) return

        if (!transcriptText?.trim()) {
          toast.error('Lecture not ready yet. Processing will finish automatically.')
          return
        }

        if (!isAiGenerationConfigured()) {
          toast.error(AI_UNAVAILABLE_MESSAGE)
          return
        }

        setLoading(true)
        setAnswer(null)
        setLastQuestion(trimmed)
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

        try {
          const response = await askAboutTranscript(transcriptText, trimmed)
          setAnswer(response)
          onDraftChange('')
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'AI request failed.')
        } finally {
          setLoading(false)
        }
      },
      [loading, onDraftChange, toast, transcriptText],
    )

    useImperativeHandle(ref, () => ({
      askQuestion: submitQuestion,
    }))

    const handleSubmit = () => void submitQuestion(draft)

    return (
      <aside
        ref={panelRef}
        className={cn(
          'flex flex-col rounded-3xl border border-white/[0.08] bg-[#0D0D0D]/90 p-5 backdrop-blur-xl',
          'shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08]">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
              <p className="text-xs text-muted">Powered by your lecture content</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/[0.06] text-muted hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <ScrollFadeContainer
          fadeColor="var(--card)"
          className="mb-5 min-h-[120px] flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
        >
          {!transcriptText?.trim() ? (
            <p className="text-sm leading-relaxed text-muted">
              Lecture not ready yet. Processing will finish automatically, then you can ask
              questions here.
            </p>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              Thinking about your lecture…
            </div>
          ) : answer ? (
            <div className="space-y-3">
              {lastQuestion && (
                <p className="text-xs font-medium text-accent/80">You asked: {lastQuestion}</p>
              )}
              <MarkdownRenderer content={answer} />
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-muted">Ask anything about this lecture…</p>
          )}
        </ScrollFadeContainer>

        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion, index) => (
            <motion.button
              key={suggestion}
              type="button"
              disabled={loading || !transcriptText?.trim()}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onDraftChange(suggestion)}
              className={cn(
                'rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5',
                'text-xs text-muted transition-all cursor-pointer',
                'hover:border-accent/25 hover:bg-accent/[0.06] hover:text-accent',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {suggestion}
            </motion.button>
          ))}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-1 rounded-full bg-ambient/20 blur-xl opacity-60" />
          <div className="relative flex items-end gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 pl-4">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSubmit()
                }
              }}
              rows={1}
              disabled={loading}
              placeholder="Ask anything about this lecture..."
              className={cn(
                'max-h-24 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm text-foreground',
                'placeholder:text-muted/60 outline-none caret-accent disabled:opacity-50',
              )}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim() || loading || !transcriptText?.trim()}
              aria-label="Send message"
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-background',
                'transition-all cursor-pointer hover:bg-accent-soft hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.35)]',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    )
  },
)
