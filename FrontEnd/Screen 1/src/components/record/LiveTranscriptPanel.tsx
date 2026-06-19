import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { LiveTranscriptChunk } from '@/hooks/useLiveTranscription'
import { cn } from '@/lib/utils'

interface LiveTranscriptPanelProps {
  chunks: LiveTranscriptChunk[]
  interimText?: string
  latestChunkId: string | null
  isProcessing: boolean
  error: string | null
  onRetry?: () => void
  paused?: boolean
  className?: string
}

export function LiveTranscriptPanel({
  chunks,
  interimText = '',
  latestChunkId,
  isProcessing,
  error,
  onRetry,
  paused = false,
  className,
}: LiveTranscriptPanelProps) {
  const prefersReducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [chunks, interimText, isProcessing, prefersReducedMotion])

  const finalChunks = chunks.filter((chunk) => !chunk.isInterim)
  const interimChunk = chunks.find((chunk) => chunk.isInterim)
  const displayInterim = interimChunk?.text ?? interimText

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-accent/20',
        'bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(214,162,11,0.08)]',
        className,
      )}
    >
      <div className="border-b border-white/[0.06] px-4 py-3 md:px-5">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
          Live Transcript
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5 min-h-[140px] max-h-[280px]"
      >
        {finalChunks.length === 0 && !displayInterim && !isProcessing && !error && (
          <p className="text-sm text-muted/70 italic">
            {paused ? 'Transcript paused.' : 'Speak — your words will appear here…'}
          </p>
        )}

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {finalChunks.map((chunk) => {
              const isLatest = chunk.id === latestChunkId
              return (
                <motion.div
                  key={chunk.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={cn(
                    'rounded-xl px-3 py-2.5 transition-colors duration-500',
                    isLatest && 'bg-accent/[0.06] border border-accent/15',
                  )}
                >
                  <span className="font-mono text-[11px] tabular-nums text-muted/80">
                    {chunk.timestampLabel}
                  </span>
                  <p
                    className={cn(
                      'mt-1 text-sm leading-relaxed md:text-[15px]',
                      isLatest ? 'text-foreground' : 'text-foreground/90',
                    )}
                  >
                    {chunk.text}
                  </p>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {displayInterim && (
            <motion.p
              key="interim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl px-3 py-2.5 text-sm leading-relaxed text-muted/70 italic md:text-[15px]"
            >
              {displayInterim}
            </motion.p>
          )}

          {isProcessing && !displayInterim && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-xs text-muted"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin text-red/80" />
              Listening…
            </motion.div>
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-red/20 bg-red/[0.04] px-4 py-3 md:px-5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
            <div className="flex-1">
              <p className="text-sm text-red/90">Transcription failed.</p>
              <p className="mt-0.5 text-xs text-muted">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 text-xs font-medium text-accent hover:text-accent-soft transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
