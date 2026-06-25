import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { LiveTranscriptChunk } from '@/hooks/useLiveTranscription'
import { SpeakerBadge } from '@/components/transcript/SpeakerBadge'
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
  isProcessing,
  error,
  onRetry,
  paused = false,
  className,
}: LiveTranscriptPanelProps) {
  const prefersReducedMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)

  const finalChunks = useMemo(() => chunks.filter((chunk) => !chunk.isInterim), [chunks])
  const interimChunk = useMemo(() => chunks.find((chunk) => chunk.isInterim), [chunks])
  const displayInterim = interimChunk?.text || interimText

  const latestChunk = useMemo(() => finalChunks[finalChunks.length - 1], [finalChunks])

  const latestTokens = useMemo(() => {
    if (!latestChunk) return []
    return latestChunk.text.split(/(\s+)/)
  }, [latestChunk])

  const [revealedTokenIndex, setRevealedTokenIndex] = useState(0)

  useEffect(() => {
    if (!latestChunk) {
      setRevealedTokenIndex(0)
      return
    }

    if (prefersReducedMotion) {
      setRevealedTokenIndex(latestTokens.length)
      return
    }

    setRevealedTokenIndex(0)

    const interval = setInterval(() => {
      setRevealedTokenIndex((prev) => {
        if (prev >= latestTokens.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 2 // Reveal word + trailing space
      })
    }, 150) // 150ms reveal rate per word

    return () => clearInterval(interval)
  }, [latestChunk?.id, latestTokens.length, prefersReducedMotion])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [chunks, interimText, isProcessing, prefersReducedMotion, revealedTokenIndex])

  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-accent/20',
        'bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(var(--color-accent-rgb),0.08)]',
        className,
      )}
    >
      <div className="border-b border-white/[0.06] px-4 py-3 md:px-5">
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
          Live Captions
        </p>
        <p className="mt-0.5 text-[11px] text-muted">Professor vs student detection active</p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5 min-h-[140px] max-h-[280px]"
      >
        {finalChunks.length === 0 && !displayInterim && !isProcessing && !error && (
          <p className="text-sm text-muted/70 italic">
            {paused ? 'Captions paused.' : 'Speak — your words will appear here…'}
          </p>
        )}

        <div className="text-[15px] leading-[1.75] text-foreground/90 select-text">
          {finalChunks.map((chunk, chunkIdx) => {
            const isLatest = chunkIdx === finalChunks.length - 1

            if (!isLatest) {
              return (
                <span key={chunk.id} className="inline text-foreground/95">
                  {chunk.speaker && chunk.speaker !== 'unknown' && (
                    <SpeakerBadge speaker={chunk.speaker} compact className="mr-1.5 align-middle" />
                  )}
                  {chunk.text}{' '}
                </span>
              )
            }

            const revealedText = latestTokens.slice(0, revealedTokenIndex).join('')

            return (
              <span key={chunk.id} className="inline text-foreground/95">
                {chunk.speaker && chunk.speaker !== 'unknown' && (
                  <SpeakerBadge speaker={chunk.speaker} compact className="mr-1.5 align-middle" />
                )}
                {revealedText}
              </span>
            )
          })}

          {displayInterim && (
            <span className="text-muted/65 italic ml-1">
              {displayInterim}
            </span>
          )}

          {isProcessing && !displayInterim && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted/60 ml-2">
              <Loader2 className="h-3 w-3 animate-spin text-accent" />
              listening…
            </span>
          )}

          {!paused && !error && (
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse ml-2" />
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-red/20 bg-red/[0.04] px-4 py-3 md:px-5">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
            <div className="flex-1">
              <p className="text-sm text-red/90">Processing failed.</p>
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

