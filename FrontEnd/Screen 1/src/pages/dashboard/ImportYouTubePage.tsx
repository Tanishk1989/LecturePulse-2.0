import { useCallback, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Link2, Loader2, PlaySquare, RefreshCw, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ParticleField } from '@/components/effects/ParticleField'
import { YouTubeIconHero, YouTubeReadyBadge } from '@/components/dashboard/home/YouTubeImportCard'
import { useLectures } from '@/hooks/useLectures'
import {
  fetchYouTubeMetadata,
  isValidYouTubeUrl,
  type YouTubeVideoMetadata,
} from '@/lib/youtubeUtils'
import { HighlightedPageTitle, dashboardPageTitleClass } from '@/components/dashboard/ui/DashboardPageShell'
import { cn } from '@/lib/utils'

type ImportPhase = 'idle' | 'preview' | 'importing' | 'success' | 'failed'

function ImportPageBackground() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 star-particles opacity-30" />
      <ParticleField count={32} yellowRatio={0.45} />
      <div className="absolute inset-0 bg-gradient-to-b from-red/[0.04] via-transparent to-ambient/[0.04]" />
      <motion.div
        className="absolute top-1/4 left-1/2 h-[360px] w-[480px] -translate-x-1/2 rounded-full bg-red/[0.06] blur-[120px]"
        animate={prefersReducedMotion ? {} : { opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

const SUBJECTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'History',
  'Economics',
  'Literature',
]

export function ImportYouTubePage() {
  const { importYouTube } = useLectures()
  const [phase, setPhase] = useState<ImportPhase>('idle')
  const [urlInput, setUrlInput] = useState('')
  const [metadata, setMetadata] = useState<YouTubeVideoMetadata | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [subjectSelect, setSubjectSelect] = useState('')
  const [customSubject, setCustomSubject] = useState('')

  const reset = useCallback(() => {
    setPhase('idle')
    setUrlInput('')
    setMetadata(null)
    setSavedId(null)
    setError(null)
    setSubjectSelect('')
    setCustomSubject('')
  }, [])

  const handleFetchPreview = useCallback(async () => {
    if (!isValidYouTubeUrl(urlInput)) {
      setError('Enter a valid YouTube URL (watch, shorts, or youtu.be).')
      return
    }

    setIsFetching(true)
    setError(null)

    try {
      const data = await fetchYouTubeMetadata(urlInput)
      setMetadata(data)
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load video.')
      setPhase('idle')
    } finally {
      setIsFetching(false)
    }
  }, [urlInput])

  const handleImport = useCallback(async () => {
    if (!metadata) return

    setPhase('importing')
    setError(null)

    try {
      const subjectVal = subjectSelect === 'other' ? customSubject.trim() : subjectSelect
      const saved = await importYouTube(metadata, subjectVal || undefined)
      if (saved) {
        setSavedId(saved.id)
        setPhase('success')
      } else {
        setPhase('failed')
      }
    } catch (err) {
      setPhase('failed')
      setError(err instanceof Error ? err.message : 'Import failed. Please try again.')
    }
  }, [importYouTube, metadata])

  return (
    <div className="relative -mx-5 -my-7 lg:-mx-8 lg:-my-9 min-h-[calc(100dvh-72px)]">
      <div
        className={cn(
          'relative mx-auto flex min-h-[calc(100dvh-72px)] max-w-3xl flex-col overflow-hidden',
          'rounded-none border-0 bg-[#080808]/80 backdrop-blur-xl md:rounded-3xl md:border md:border-white/[0.06]',
        )}
      >
        <ImportPageBackground />

        <div className="relative z-10 flex flex-1 flex-col px-5 py-8 md:px-10 md:py-12">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/[0.08] shadow-[0_0_40px_rgba(255,59,48,0.18)]"
            >
              <PlaySquare className="h-7 w-7 text-red-400" strokeWidth={1.75} />
            </motion.div>
            <h1 className={dashboardPageTitleClass}>
              <HighlightedPageTitle title="Import YouTube" />
            </h1>
            <p className="mt-3 text-sm text-muted md:text-base">
              Paste a YouTube link to import and analyze lecture content.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.1] shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  <Check className="h-9 w-9 text-emerald" strokeWidth={2} />
                </motion.div>
                <p className="font-heading text-3xl text-foreground">Video imported.</p>
                <p className="mt-3 max-w-sm text-sm text-muted leading-relaxed">
                  Your video is saved. We&apos;re turning it into searchable notes and study material.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {savedId && (
                    <Link
                      to={`/transcript/${savedId}`}
                      className={cn(
                        'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                        'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                      )}
                    >
                      View Progress
                    </Link>
                  )}
                  <Link
                    to="/dashboard/lectures"
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
                      'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                    )}
                  >
                    View in Library
                  </Link>
                  <button
                    type="button"
                    onClick={reset}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
                      'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                    )}
                  >
                    Import Another
                  </button>
                </div>
              </motion.div>
            ) : (phase === 'preview' || phase === 'importing' || phase === 'failed') && metadata ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn(
                  'flex flex-1 flex-col rounded-3xl border border-red-500/15 bg-card/70 p-5 backdrop-blur-xl md:p-7',
                  'transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500/25 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]',
                )}
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
                    <img
                      src={metadata.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <YouTubeIconHero isHovered={false} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <YouTubeReadyBadge />
                    <p className="mt-3 text-base font-semibold text-foreground line-clamp-2">
                      {metadata.title.replace(/^▶\s*/, '')}
                    </p>
                    {metadata.authorName && (
                      <p className="mt-1 text-sm text-muted">{metadata.authorName}</p>
                    )}
                    <p className="mt-2 truncate text-xs text-muted/80">{metadata.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === 'importing'}
                    aria-label="Clear selection"
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08]',
                      'bg-white/[0.03] text-muted transition-all duration-300 cursor-pointer',
                      'hover:-translate-y-0.5 hover:text-foreground hover:border-white/[0.14]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {phase === 'failed' && error && (
                  <div className="mb-6 rounded-2xl border border-red/20 bg-red/[0.06] px-4 py-3 text-sm text-red">
                    {error}
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={phase === 'importing'}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-5 py-3 text-sm font-medium text-foreground',
                      'bg-white/[0.03] transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    Change URL
                  </button>
                  {phase === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => void handleImport()}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white',
                        'shadow-[0_0_24px_rgba(255,59,48,0.18)] transition-all duration-300 cursor-pointer',
                        'hover:bg-red-400 hover:-translate-y-0.5',
                      )}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Import
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleImport()}
                      disabled={phase === 'importing'}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-medium text-white',
                        'shadow-[0_0_24px_rgba(255,59,48,0.18)] transition-all duration-300 cursor-pointer',
                        'hover:bg-red-400 hover:-translate-y-0.5 hover:scale-[1.02]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {phase === 'importing' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        'Import Video'
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-1 flex-col justify-center"
              >
                <div
                  className={cn(
                    'rounded-3xl border border-red-500/15 bg-card/70 p-6 backdrop-blur-xl md:p-8',
                    'shadow-[0_0_40px_rgba(255,59,48,0.06)]',
                  )}
                >
                  <div className="mb-6 flex justify-center">
                    <YouTubeIconHero isHovered={false} />
                  </div>

                  <label htmlFor="youtube-url" className="block text-sm font-medium text-foreground mb-2">
                    YouTube URL
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      id="youtube-url"
                      type="url"
                      value={urlInput}
                      onChange={(event) => {
                        setUrlInput(event.target.value)
                        setError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void handleFetchPreview()
                      }}
                      placeholder="https://www.youtube.com/watch?v=…"
                      className={cn(
                        'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3.5 pl-11 pr-4',
                        'text-sm text-foreground placeholder:text-muted/60 outline-none transition-all duration-300',
                        'focus:border-red-500/35 focus:shadow-[0_0_24px_rgba(255,59,48,0.1)]',
                      )}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <label
                      htmlFor="subject-select"
                      className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wider"
                    >
                      Lecture Subject (Optional)
                    </label>
                    <div className="flex flex-col gap-3">
                      <select
                        id="subject-select"
                        value={subjectSelect}
                        onChange={(e) => setSubjectSelect(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-[#0E0E0E] px-3 py-2 text-sm text-foreground outline-none focus:border-red-500/35"
                      >
                        <option value="" className="bg-[#0D0D0D]">Select a subject...</option>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub} className="bg-[#0D0D0D]">{sub}</option>
                        ))}
                        <option value="other" className="bg-[#0D0D0D]">Other (Type Custom...)</option>
                      </select>
                      {subjectSelect === 'other' && (
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder="Type custom subject (e.g. Chemistry, Philosophy)"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-red-500/35"
                        />
                      )}
                    </div>
                  </div>

                  {error && (
                    <p className="mt-3 text-sm text-red">{error}</p>
                  )}

                  <p className="mt-4 text-xs text-muted leading-relaxed">
                    Supports youtube.com/watch, youtu.be, and Shorts links.
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleFetchPreview()}
                    disabled={!urlInput.trim() || isFetching}
                    className={cn(
                      'mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-6 py-3.5 text-sm font-medium text-white',
                      'shadow-[0_0_24px_rgba(255,59,48,0.18)] transition-all duration-300 cursor-pointer',
                      'hover:bg-red-400 hover:-translate-y-0.5',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading preview…
                      </>
                    ) : (
                      'Preview Video'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
