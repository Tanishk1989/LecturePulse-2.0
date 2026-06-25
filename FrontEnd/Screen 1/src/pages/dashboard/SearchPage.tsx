import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FileText, Loader2, NotebookPen, Search, Tag } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useToast } from '@/components/ui/ToastProvider'
import { searchLectures, SEARCH_FIELD_LABELS, type SearchResult } from '@/services/searchService'
import { cn } from '@/lib/utils'

function highlightSnippet(snippet: string, query: string): ReactNode {
  if (!query.trim()) return snippet

  const lowerSnippet = snippet.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerSnippet.indexOf(lowerQuery)
  if (index === -1) return snippet

  return (
    <>
      {snippet.slice(0, index)}
      <mark className="rounded bg-accent/25 px-0.5 text-foreground">{snippet.slice(index, index + query.length)}</mark>
      {snippet.slice(index + query.length)}
    </>
  )
}

function getResultLink(lectureId: string, field: string): string {
  if (field === 'transcript') return `/transcript/${lectureId}`
  return `/notes/${lectureId}`
}

function SearchResultCard({ result, query }: { result: SearchResult; query: string }) {
  const primaryMatch = result.matches[0]

  return (
    <Link
      to={getResultLink(result.lectureId, primaryMatch?.field ?? 'summary')}
      className={cn(
        'block rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200',
        'hover:border-accent/25 hover:bg-accent/[0.04]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{result.lectureTitle}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {result.subject && <span>{result.subject}</span>}
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {result.matches.slice(0, 3).map((match, index) => (
          <div key={`${match.field}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/80">
              {SEARCH_FIELD_LABELS[match.field]}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">
              {highlightSnippet(match.snippet, query)}
            </p>
          </div>
        ))}
      </div>
    </Link>
  )
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setQuery(initialQuery)
    if (initialQuery.trim()) {
      void runSearch(initialQuery)
    }
  }, [initialQuery])

  const runSearch = async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const response = await searchLectures(trimmed)
      setResults(response.results)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Search failed.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    setSearchParams(trimmed ? { q: trimmed } : {})
    void runSearch(trimmed)
  }

  const resultCountLabel = useMemo(() => {
    if (!searched) return null
    if (loading) return 'Searching…'
    return `${results.length} result${results.length === 1 ? '' : 's'}`
  }, [loading, results.length, searched])

  return (
    <DashboardPageShell className="space-y-8">
      <FadeUp>
        <DashboardPageHeader
          title="Find anything in your lectures"
          description="Search across titles, transcripts, notes, concepts, definitions, subjects, and tags."
        />
      </FadeUp>

      <FadeUp delay={0.05}>
        <form onSubmit={handleSubmit} className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by keyword or topic…"
            autoFocus
            className={cn(
              'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-foreground',
              'placeholder:text-muted/70 outline-none backdrop-blur-xl transition-all duration-300',
              'focus:border-accent/40 focus:bg-white/[0.04] focus:shadow-[0_0_24px_rgba(180,230,29,0.1)]',
            )}
          />
        </form>
      </FadeUp>

      {resultCountLabel && (
        <FadeUp delay={0.08}>
          <p className="text-sm text-muted">{resultCountLabel}</p>
        </FadeUp>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : searched && results.length === 0 ? (
        <FadeUp delay={0.1}>
          <div className="rounded-3xl border border-white/[0.08] bg-card/50 px-6 py-16 text-center">
            <Search className="mx-auto mb-4 h-10 w-10 text-muted" strokeWidth={1.5} />
            <p className="text-base font-medium text-foreground">No matches found</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Try a different keyword, or check spelling. Search covers lecture titles, transcripts, notes, and tags.
            </p>
          </div>
        </FadeUp>
      ) : (
        <div className="grid gap-4">
          {results.map((result, index) => (
            <FadeUp key={result.lectureId} delay={0.04 + index * 0.03}>
              <SearchResultCard result={result} query={query.trim()} />
            </FadeUp>
          ))}
        </div>
      )}

      {!searched && (
        <FadeUp delay={0.12}>
          <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <NotebookPen className="h-5 w-5 text-accent mb-3" />
              <p className="text-sm font-medium text-foreground">Notes & concepts</p>
              <p className="mt-1 text-xs text-muted">Find lectures by summary, key concepts, or definitions.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <FileText className="h-5 w-5 text-accent mb-3" />
              <p className="text-sm font-medium text-foreground">Full transcripts</p>
              <p className="mt-1 text-xs text-muted">Search the raw spoken text from any recorded lecture.</p>
            </div>
          </div>
        </FadeUp>
      )}
    </DashboardPageShell>
  )
}
