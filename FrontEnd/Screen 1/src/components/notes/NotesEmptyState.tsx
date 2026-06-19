import { FileText, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NotesEmptyStateProps {
  lectureId: string
  hasTranscript: boolean
  isPdf?: boolean
  error?: string | null
  onRetry?: () => void
  className?: string
}

export function NotesEmptyState({
  lectureId,
  hasTranscript,
  isPdf = false,
  error,
  onRetry,
  className,
}: NotesEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-6 py-20 text-center',
        className,
      )}
    >
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-accent/20 bg-accent/[0.06] shadow-[0_0_40px_rgba(214,162,11,0.1)]">
        <FileText className="h-9 w-9 text-accent" strokeWidth={1.5} />
      </div>

      {!hasTranscript ? (
        <>
          <p className="text-lg font-semibold text-foreground">
            {isPdf ? 'Extracting PDF text' : 'Transcript required'}
          </p>
          <p className="mt-2 max-w-md text-sm text-muted leading-relaxed">
            {isPdf
              ? 'Smart notes are generated from text extracted from your PDF. Try again if extraction failed.'
              : 'Smart notes are generated from your lecture transcript. Transcribe your lecture first.'}
          </p>
          {isPdf ? (
            onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  'mt-8 inline-flex items-center gap-2 rounded-full border border-accent/25 px-6 py-3',
                  'text-sm font-medium text-accent transition-all cursor-pointer hover:bg-accent/[0.08]',
                )}
              >
                <RefreshCw className="h-4 w-4" />
                Retry Extraction
              </button>
            )
          ) : (
            <Link
              to={`/transcript/${lectureId}`}
              className={cn(
                'mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                'shadow-[0_0_24px_rgba(214,162,11,0.2)] hover:bg-accent-soft transition-all cursor-pointer',
              )}
            >
              Go to Transcript
            </Link>
          )}
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-foreground">
            {error ? 'Notes generation failed' : 'Ready to generate notes'}
          </p>
          {error && <p className="mt-2 max-w-md text-sm text-muted">{error}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                'mt-8 inline-flex items-center gap-2 rounded-full border border-accent/25 px-6 py-3',
                'text-sm font-medium text-accent transition-all cursor-pointer hover:bg-accent/[0.08]',
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </>
      )}
    </div>
  )
}
