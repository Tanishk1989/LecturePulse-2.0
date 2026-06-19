import { useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { NotesAIActionsPanel } from '@/components/notes/NotesAIActionsPanel'
import { NotesEmptyState } from '@/components/notes/NotesEmptyState'
import { NotesGeneratingState } from '@/components/notes/NotesGeneratingState'
import { NotesNavigation } from '@/components/notes/NotesNavigation'
import { NotesSectionContent } from '@/components/notes/NotesSectionContent'
import { useLectureNotes } from '@/hooks/useLectureNotes'
import { useLectures } from '@/hooks/useLectures'
import type { NoteSectionId } from '@/types/notes'
import { getLectureMediaKind } from '@/lib/lectureFilters'
import { cn } from '@/lib/utils'

export function LectureNotesPage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const { lectures, loading: lecturesLoading } = useLectures()
  const [activeSection, setActiveSection] = useState<NoteSectionId>('summary')

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
  const showGenerating = isGenerating || isExtracting
  const showEmpty =
    !showNotes && !showGenerating && !isLoading && (phase === 'failed' || !canGenerate)

  return (
    <div className="mx-auto w-full max-w-[1600px]">
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
            <h1 className="mt-1 font-heading text-3xl text-foreground md:text-4xl">
              {lecture?.title ?? 'Lecture Notes'}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {isPdf
                ? 'AI-generated study material from your PDF'
                : 'AI-generated study material from your transcript'}
            </p>
          </div>

          {showNotes && (
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
          )}
        </div>
      </FadeUp>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
        <FadeUp delay={0.06}>
          <NotesNavigation
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            className="xl:sticky xl:top-24 xl:self-start"
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

        <FadeUp delay={0.14}>
          <NotesAIActionsPanel
            lectureId={lectureId}
            transcriptText={transcriptText}
            notesContent={showNotes ? notes.content : null}
            className="xl:sticky xl:top-24 xl:self-start"
          />
        </FadeUp>
      </div>
    </div>
  )
}
