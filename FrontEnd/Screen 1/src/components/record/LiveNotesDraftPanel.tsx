import { Loader2, Sparkles } from 'lucide-react'
import type { LiveNotesDraft } from '@/services/liveNotesService'
import { cn } from '@/lib/utils'

interface LiveNotesDraftPanelProps {
  draft: LiveNotesDraft
  status: 'idle' | 'waiting' | 'generating' | 'ready' | 'error'
  error: string | null
  className?: string
}

export function LiveNotesDraftPanel({
  draft,
  status,
  error,
  className,
}: LiveNotesDraftPanelProps) {
  const hasDraft = Boolean(
    draft.summary || draft.keyPoints.length > 0 || draft.concepts.length > 0,
  )

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-white/[0.03] backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 md:px-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
            Live Notes Draft
          </p>
        </div>
        {status === 'generating' && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating
          </span>
        )}
      </div>

      <div className="min-h-[140px] max-h-[280px] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
        {status === 'waiting' && !hasDraft && (
          <p className="text-sm italic text-muted/70">
            Live notes will appear once there is enough lecture context.
          </p>
        )}

        {status === 'idle' && !hasDraft && (
          <p className="text-sm italic text-muted/70">
            Start recording to draft notes in real time.
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red/20 bg-red/[0.05] px-3 py-2 text-sm text-red/90">
            {error}
          </p>
        )}

        {hasDraft && (
          <div className="space-y-4">
            {draft.summary && (
              <section>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Summary
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">{draft.summary}</p>
              </section>
            )}

            {draft.keyPoints.length > 0 && (
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Key Points
                </p>
                <ul className="space-y-2">
                  {draft.keyPoints.map((point, index) => (
                    <li key={`${point}-${index}`} className="flex gap-2 text-sm text-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {draft.concepts.length > 0 && (
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Concepts
                </p>
                <div className="flex flex-wrap gap-2">
                  {draft.concepts.map((concept, index) => (
                    <span
                      key={`${concept}-${index}`}
                      className="rounded-full border border-accent/20 bg-accent/[0.08] px-2.5 py-1 text-xs text-accent"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
