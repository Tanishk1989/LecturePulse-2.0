import { useMemo, useState, useEffect } from 'react'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { NotesEmptyState } from '@/components/notes/NotesEmptyState'
import { NotesGeneratingState } from '@/components/notes/NotesGeneratingState'
import { NotesNavigation } from '@/components/notes/NotesNavigation'
import { NotesSectionContent } from '@/components/notes/NotesSectionContent'
import { useLectureNotes } from '@/hooks/useLectureNotes'
import { useLectures } from '@/hooks/useLectures'
import type { NoteSectionId } from '@/types/notes'
import { getLectureMediaKind } from '@/lib/lectureFilters'
import { dashboardPageTitleClass } from '@/components/dashboard/ui/DashboardPageShell'
import { useToast } from '@/components/ui/ToastProvider'
import { recordStudySession } from '@/services/streakService'
import { exportLectureNotes } from '@/services/noteExportService'
import { formatNotesForCopy } from '@/services/aiGenerationService'
import { TranslateContentButton } from '@/components/shared/TranslateContentButton'
import { ShareNotesButton } from '@/components/notes/ShareNotesButton'
import { cn } from '@/lib/utils'

export function LectureNotesPage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const { lectures, loading: lecturesLoading } = useLectures()
  const [activeSection, setActiveSection] = useState<NoteSectionId>('summary')
  const [exportOpen, setExportOpen] = useState(false)
  const { toast } = useToast()

  const lecture = useMemo(
    () => lectures.find((item) => item.id === lectureId),
    [lectureId, lectures],
  )

  const isPdf = lecture ? getLectureMediaKind(lecture) === 'pdf' : false

  const {
    notes,
    transcriptText,
    phase,
    isLoading,
    isGenerating,
    isExtracting,
    error,
    canGenerate,
    generateNotes,
    retryGeneration,
  } = useLectureNotes(lectureId, {
    autoGenerate: true,
    isPdf,
    pdfUrl: lecture?.audioUrl,
    pageCount: lecture?.pageCount,
  })

  if (!lectureId) {
    return <Navigate to="/dashboard/lectures" replace />
  }

  if (!lecturesLoading && !lecture) {
    return <Navigate to="/dashboard/lectures" replace />
  }

  const showNotes = phase === 'completed' && notes?.content

  // Track 5 minutes session time
  useEffect(() => {
    if (!showNotes || !lectureId) return

    const STORAGE_TIME_KEY = `lecturepulse:session-time:${lectureId}`
    const STORAGE_LOGGED_KEY = `lecturepulse:session-logged:${lectureId}:${new Date().toDateString()}`

    // If already logged today, do nothing
    if (localStorage.getItem(STORAGE_LOGGED_KEY) === 'true') {
      return
    }

    let seconds = Number(localStorage.getItem(STORAGE_TIME_KEY)) || 0

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return

      seconds += 1
      localStorage.setItem(STORAGE_TIME_KEY, String(seconds))

      if (seconds >= 300) {
        clearInterval(interval)
        localStorage.setItem(STORAGE_LOGGED_KEY, 'true')
        localStorage.removeItem(STORAGE_TIME_KEY) // clean up

        void recordStudySession(lectureId, seconds)
          .then((res) => {
            if (res.success) {
              toast.success('🔥 Study session logged! Your daily streak is protected.')
            }
          })
          .catch((err) => {
            console.error('Failed to log study session:', err)
          })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [showNotes, lectureId, toast])

  const showGenerating = isGenerating || isExtracting
  const showEmpty =
    !showNotes && !showGenerating && !isLoading && (phase === 'failed' || !canGenerate)

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 py-6">
      <FadeUp>
        <Link
          to="/dashboard/lectures"
          className={cn(
            'mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors',
            'hover:text-foreground cursor-pointer',
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      </FadeUp>

      <FadeUp delay={0.04}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
              Smart Notes
            </p>
            <h1 className={cn('mt-1', dashboardPageTitleClass)}>
              {lecture?.title ?? 'Lecture Notes'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isPdf
                ? 'AI-generated study material from your PDF'
                : 'AI-generated study material from your lecture'}
            </p>
          </div>

          {showNotes && (
            <div className="flex flex-wrap items-center gap-2">
              {notes?.content && (
                <TranslateContentButton
                  sourceText={formatNotesForCopy(notes.content)}
                  contextLabel="lecture notes"
                />
              )}
              {lectureId && <ShareNotesButton lectureId={lectureId} />}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((open) => !open)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5',
                    'text-sm font-medium text-foreground bg-white/[0.03] transition-all cursor-pointer',
                    'hover:border-accent/25 hover:bg-accent/[0.06]',
                  )}
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                {exportOpen && notes?.content && (
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/[0.08] bg-card p-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        exportLectureNotes(
                          lecture?.title ?? 'Lecture',
                          notes.content,
                          'markdown',
                          lecture?.subject,
                        )
                        setExportOpen(false)
                        toast.success('Markdown file downloaded.')
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/[0.04] cursor-pointer"
                    >
                      Markdown (.md)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        exportLectureNotes(
                          lecture?.title ?? 'Lecture',
                          notes.content,
                          'pdf',
                          lecture?.subject,
                        )
                        setExportOpen(false)
                        toast.success('Print dialog opened for PDF save.')
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-white/[0.04] cursor-pointer"
                    >
                      PDF (print)
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void generateNotes()}
                disabled={isGenerating || !canGenerate}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5',
                  'text-sm font-medium text-foreground bg-white/[0.03] transition-all cursor-pointer',
                  'hover:border-accent/25 hover:bg-accent/[0.06] disabled:opacity-50',
                )}
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
                Regenerate
              </button>
            </div>
          )}
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FadeUp delay={0.06}>
          <NotesNavigation
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            notesContent={showNotes ? notes.content : null}
            className="lg:sticky lg:top-24 lg:self-start"
          />
        </FadeUp>

        <FadeUp delay={0.1}>
          <section
            className={cn(
              'relative flex min-h-[calc(100dvh-14rem)] flex-col overflow-hidden rounded-3xl',
              'border border-white/[0.08] bg-[#0D0D0D]/95 backdrop-blur-xl',
              'shadow-[0_20px_60px_rgba(0,0,0,0.4)]',
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-ambient/[0.03]" />

            <div className="relative min-h-0 flex-1 p-5 md:p-8">
              {isLoading ? (
                <NotesGeneratingState />
              ) : showGenerating ? (
                <NotesGeneratingState />
              ) : showNotes ? (
                <NotesSectionContent
                  section={activeSection}
                  content={notes.content}
                  transcriptText={transcriptText}
                  lectureId={lectureId}
                  lectureTitle={lecture?.title ?? ''}
                  subject={lecture?.subject}
                />
              ) : showEmpty ? (
                <NotesEmptyState
                  lectureId={lectureId}
                  hasTranscript={Boolean(transcriptText)}
                  isPdf={isPdf}
                  error={error}
                  onRetry={phase === 'failed' ? () => void retryGeneration() : undefined}
                />
              ) : phase === 'ready' && canGenerate ? (
                <NotesGeneratingState />
              ) : null}
            </div>
          </section>
        </FadeUp>
      </div>
    </div>
  )
}
