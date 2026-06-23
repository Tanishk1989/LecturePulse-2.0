import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { formatTimestamp } from '@/lib/transcriptUtils'
import type { TranscriptSegment } from '@/types/transcript'
import { cn } from '@/lib/utils'

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  fullText: string
  language: string | null
  currentTime: number
  searchQuery: string
  onSearchChange: (query: string) => void
  onSeek: (seconds: number) => void
  className?: string
}

function highlightText(text: string, query: string): ReactNode {
  if (!query.trim()) return text

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={index}
        className="rounded-sm bg-accent/25 px-0.5 text-foreground not-italic"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function TranscriptViewer({
  segments,
  fullText,
  language,
  currentTime,
  searchQuery,
  onSearchChange,
  onSeek,
  className,
}: TranscriptViewerProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const activeSegmentId = useMemo(() => {
    const active = segments.find(
      (segment) => currentTime >= segment.start && currentTime < segment.end,
    )
    return active?.id ?? null
  }, [currentTime, segments])

  const filteredSegments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return segments
    return segments.filter((segment) => segment.text.toLowerCase().includes(query))
  }, [searchQuery, segments])

  const matchCount = searchQuery.trim() ? filteredSegments.length : null

  useEffect(() => {
    if (activeSegmentId == null || searchQuery.trim()) return
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeSegmentId, searchQuery])

  if (segments.length === 0 && fullText) {
    return (
      <div className={cn('flex flex-col', className)}>
        <SearchHeader
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          matchCount={matchCount}
          language={language}
        />
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <p className="text-base leading-relaxed text-foreground/90">
            {highlightText(fullText, searchQuery)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        matchCount={matchCount}
        language={language}
      />

      <div
        ref={listRef}
        className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-3xl border border-white/[0.06] bg-[#0a0a0a]/70 p-2 md:p-3"
      >
        {filteredSegments.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted">
            No matches for &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSegments.map((segment, index) => {
              const isActive = segment.id === activeSegmentId && !searchQuery.trim()
              return (
                <motion.button
                  key={segment.id}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.015, 0.3) }}
                  onClick={() => onSeek(segment.start)}
                  className={cn(
                    'group flex w-full items-start gap-4 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 cursor-pointer',
                    isActive
                      ? 'border border-accent/25 bg-accent/[0.08] shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.08)]'
                      : 'border border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 font-mono text-xs tabular-nums transition-colors',
                      isActive ? 'text-accent' : 'text-muted group-hover:text-accent/80',
                    )}
                  >
                    {formatTimestamp(segment.start)}
                  </span>
                  <span
                    className={cn(
                      'text-[15px] leading-relaxed',
                      isActive ? 'text-foreground' : 'text-foreground/85',
                    )}
                  >
                    {highlightText(segment.text, searchQuery)}
                  </span>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchHeader({
  searchQuery,
  onSearchChange,
  matchCount,
  language,
}: {
  searchQuery: string
  onSearchChange: (query: string) => void
  matchCount: number | null
  language: string | null
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search lecture…"
          className={cn(
            'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-10',
            'text-sm text-foreground placeholder:text-muted/70 outline-none transition-colors',
            'focus:border-accent/30 focus:bg-white/[0.05]',
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs text-muted">
        {matchCount != null && (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono tabular-nums">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}
        {language && (
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 capitalize">
            {language}
          </span>
        )}
      </div>
    </div>
  )
}
