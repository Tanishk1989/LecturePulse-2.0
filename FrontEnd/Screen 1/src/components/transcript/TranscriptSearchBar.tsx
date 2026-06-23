import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TranscriptSearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  matchCount: number
  activeMatchIndex: number
  onNextMatch: () => void
  onPreviousMatch: () => void
  hasQuery: boolean
  className?: string
}

export function TranscriptSearchBar({
  query,
  onQueryChange,
  matchCount,
  activeMatchIndex,
  onNextMatch,
  onPreviousMatch,
  hasQuery,
  className,
}: TranscriptSearchBarProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-1 px-1 pb-4 pt-1',
        'bg-gradient-to-b from-[#0D0D0D] via-[#0D0D0D]/95 to-transparent backdrop-blur-md',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.shiftKey ? onPreviousMatch() : onNextMatch()
              }
            }}
            placeholder="Search lecture…"
            className={cn(
              'w-full rounded-full border border-white/[0.08] bg-white/[0.03] py-2.5 pl-11 pr-10',
              'text-sm text-foreground placeholder:text-muted/70 outline-none transition-all',
              'focus:border-accent/30 focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.08)]',
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasQuery && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex shrink-0 items-center gap-1.5"
          >
            <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-xs tabular-nums text-muted sm:inline">
              {matchCount > 0 ? activeMatchIndex + 1 : 0}/{matchCount}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted">
              {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
            </span>
            <button
              type="button"
              onClick={onPreviousMatch}
              disabled={matchCount === 0}
              aria-label="Previous match"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted transition-all hover:text-accent disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onNextMatch}
              disabled={matchCount === 0}
              aria-label="Next match"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted transition-all hover:text-accent disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
