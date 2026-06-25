import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { explainConcept } from '@/services/aiGenerationService'
import { cn } from '@/lib/utils'

interface ConceptExplainerDialogProps {
  term: string
  context: string
  transcriptText?: string | null
  onClose: () => void
}

export function ConceptExplainerDialog({
  term,
  context,
  transcriptText,
  onClose,
}: ConceptExplainerDialogProps) {
  const [loading, setLoading] = useState(true)
  const [explanation, setExplanation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const loadExplanation = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const text = await explainConcept(term, context, transcriptText ?? undefined)
      setExplanation(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not explain this concept.')
    } finally {
      setLoading(false)
    }
  }, [context, term, transcriptText])

  useEffect(() => {
    void loadExplanation()
  }, [loadExplanation])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div
        className={cn(
          'relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl',
          'p-6 max-h-[90vh] overflow-y-auto',
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close explainer"
          className="absolute right-4 top-4 text-muted hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 pr-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Concept Explainer</p>
            <h3 className="font-heading text-lg text-foreground">{term}</h3>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
            <p className="text-sm text-muted">Explaining in simple terms…</p>
          </div>
        ) : error ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-red">{error}</p>
            <button
              type="button"
              onClick={() => void loadExplanation()}
              className="rounded-xl border border-white/[0.12] px-4 py-2 text-sm text-foreground cursor-pointer hover:border-accent/25"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {explanation.split(/\n\n+/).filter(Boolean).map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-foreground/85">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ClickableTermProps {
  term: string
  context: string
  transcriptText?: string | null
  className?: string
}

export function ClickableTerm({
  term,
  context,
  transcriptText,
  className,
}: ClickableTermProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          'inline text-left underline decoration-accent/40 decoration-dotted underline-offset-2',
          'hover:text-accent hover:decoration-accent transition-colors cursor-pointer',
          className,
        )}
        title={`Explain "${term}"`}
      >
        {term}
      </button>
      {open && (
        <ConceptExplainerDialog
          term={term}
          context={context}
          transcriptText={transcriptText}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
