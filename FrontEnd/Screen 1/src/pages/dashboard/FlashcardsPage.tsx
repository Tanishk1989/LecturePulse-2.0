import { useMemo, useState } from 'react'
import { Filter, Layers, Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { FlashcardDeck } from '@/components/flashcards/FlashcardDeck'
import { FlashcardsEmptyState } from '@/components/flashcards/FlashcardsEmptyState'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import { useFlashcards } from '@/hooks/useFlashcards'
import { useLectures } from '@/hooks/useLectures'
import {
  countDueFlashcards,
  filterDueFlashcards,
  sortFlashcardsForStudy,
} from '@/lib/flashcardStudy'
import { generateFlashcards, isAiGenerationConfigured } from '@/services/aiGenerationService'
import { generateDeckFromAllLectures } from '@/services/flashcardBatchService'
import { getTranscriptByLectureId } from '@/services/transcriptionService'
import type { FlashcardStatus } from '@/types/flashcard'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'due' | FlashcardStatus

export function FlashcardsPage() {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { lectures } = useLectures()
  const { flashcards, loading, reviewCard, removeFlashcard, saveFlashcards, refresh } =
    useFlashcards()

  const [lectureFilter, setLectureFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('due')
  const [generating, setGenerating] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState<string | null>(null)

  const lectureTitles = useMemo(
    () => Object.fromEntries(lectures.map((lecture) => [lecture.id, lecture.title])),
    [lectures],
  )

  const scopedCards = useMemo(() => {
    if (lectureFilter === 'all') return flashcards
    return flashcards.filter((card) => card.lectureId === lectureFilter)
  }, [flashcards, lectureFilter])

  const dueCount = useMemo(() => countDueFlashcards(scopedCards), [scopedCards])

  const filteredCards = useMemo(() => {
    let cards = scopedCards

    if (statusFilter === 'due') {
      cards = filterDueFlashcards(cards)
    } else if (statusFilter !== 'all') {
      cards = cards.filter((card) => card.status === statusFilter)
    }

    return sortFlashcardsForStudy(cards)
  }, [scopedCards, statusFilter])

  const stats = useMemo(() => {
    return {
      total: scopedCards.length,
      due: countDueFlashcards(scopedCards),
      new: scopedCards.filter((c) => c.status === 'new').length,
      review: scopedCards.filter((c) => c.status === 'review').length,
      mastered: scopedCards.filter((c) => c.status === 'mastered').length,
    }
  }, [scopedCards])

  const lecturesWithCards = useMemo(() => {
    const ids = new Set(flashcards.map((card) => card.lectureId))
    return lectures.filter((lecture) => ids.has(lecture.id))
  }, [flashcards, lectures])

  const canGenerateAll =
    isAiGenerationConfigured() && lectures.length > 0 && Boolean(user)

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Sign in to generate flashcards.')
      return
    }
    const targetLectureId = lectureFilter !== 'all' ? lectureFilter : lectures[0]?.id
    if (!targetLectureId) {
      toast.error('Upload or record a lecture first.')
      return
    }

    setGenerating(true)
    try {
      const transcript = await getTranscriptByLectureId(user.uid, targetLectureId)
      if (!transcript?.fullText?.trim()) {
        toast.error('No lecture content found for this lecture.')
        return
      }

      const generated = await generateFlashcards(transcript.fullText)
      if (generated.length === 0) {
        toast.error('Could not generate flashcards from this lecture.')
        return
      }

      const saved = await saveFlashcards(targetLectureId, generated)
      if (saved.length > 0) {
        toast.success(`${saved.length} flashcards saved to your deck.`)
        setLectureFilter(targetLectureId)
        setStatusFilter('due')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Flashcard generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAll = async () => {
    if (!user) {
      toast.error('Sign in to generate flashcards.')
      return
    }
    if (lectures.length === 0) {
      toast.error('Upload or record a lecture first.')
      return
    }

    setBatchGenerating(true)
    setBatchProgress('Starting batch generation…')

    try {
      const result = await generateDeckFromAllLectures(
        user.uid,
        lectures.map((lecture) => ({ id: lecture.id, title: lecture.title })),
        {
          skipExisting: true,
          onProgress: (progress) => {
            if (progress.phase === 'done') {
              setBatchProgress(null)
              return
            }
            const phaseLabel =
              progress.phase === 'checking'
                ? 'Checking'
                : progress.phase === 'generating'
                  ? 'Generating'
                  : progress.phase === 'saving'
                    ? 'Saving'
                    : 'Skipping'
            setBatchProgress(
              `${phaseLabel} ${progress.current}/${progress.total}${progress.lectureTitle ? `: ${progress.lectureTitle}` : ''}`,
            )
          },
        },
      )

      await refresh()
      setStatusFilter('due')
      setLectureFilter('all')

      if (result.totalSaved > 0) {
        toast.success(
          `${result.totalSaved} flashcards saved from ${result.lecturesProcessed} lecture${result.lecturesProcessed === 1 ? '' : 's'}.`,
        )
      } else if (result.lecturesSkipped > 0) {
        toast.success('All lectures already have flashcards or no lecture content was found.')
      } else {
        toast.error('Could not generate flashcards from your lectures.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Batch generation failed.')
    } finally {
      setBatchGenerating(false)
      setBatchProgress(null)
    }
  }

  const handleDelete = async (id: string) => {
    await removeFlashcard(id)
    if (filteredCards.length <= 1) {
      await refresh()
    }
  }

  const showEmpty = !loading && flashcards.length === 0
  const showFilteredEmpty = !loading && flashcards.length > 0 && filteredCards.length === 0

  return (
    <DashboardPageShell className="max-w-4xl mx-auto">
      <FadeUp>
        <DashboardPageHeader
          title="Flashcards"
          description="Study with spaced repetition — cards you know come back later, ones you miss return sooner."
          className="text-center mx-auto"
        />
      </FadeUp>

      {!showEmpty && dueCount > 0 && statusFilter !== 'due' && (
        <FadeUp delay={0.05}>
          <button
            type="button"
            onClick={() => setStatusFilter('due')}
            className={cn(
              'mb-6 w-full rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-3',
              'text-sm text-accent/90 transition-all hover:bg-accent/[0.1] cursor-pointer',
            )}
          >
            {dueCount} card{dueCount === 1 ? '' : 's'} due for review — start study session
          </button>
        </FadeUp>
      )}

      {!showEmpty && (
        <FadeUp delay={0.08}>
          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Lecture
                  </span>
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                    <select
                      value={lectureFilter}
                      onChange={(event) => setLectureFilter(event.target.value)}
                      className={cn(
                        'appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] pl-9 pr-8 py-2.5',
                        'text-sm text-foreground outline-none cursor-pointer min-w-[180px]',
                      )}
                    >
                      <option value="all">All lectures</option>
                      {lecturesWithCards.map((lecture) => (
                        <option key={lecture.id} value={lecture.id}>
                          {lecture.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Study mode
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    className={cn(
                      'appearance-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5',
                      'text-sm text-foreground outline-none cursor-pointer min-w-[160px]',
                    )}
                  >
                    <option value="due">Due today ({stats.due})</option>
                    <option value="all">All ({stats.total})</option>
                    <option value="new">New ({stats.new})</option>
                    <option value="review">Review ({stats.review})</option>
                    <option value="mastered">Mastered ({stats.mastered})</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleGenerateAll()}
                  disabled={batchGenerating || !canGenerateAll}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-2.5',
                    'text-sm font-medium text-foreground transition-all hover:border-accent/25 hover:bg-accent/[0.06]',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <Layers className={cn('h-4 w-4', batchGenerating && 'animate-pulse')} />
                  {batchGenerating ? 'Generating all…' : 'Generate all'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating || lectures.length === 0}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08] px-5 py-2.5',
                    'text-sm font-medium text-accent transition-all hover:bg-accent/[0.12]',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <Sparkles className={cn('h-4 w-4', generating && 'animate-pulse')} />
                  {generating ? 'Generating…' : 'Generate more'}
                </button>
              </div>
            </div>

            {batchProgress && (
              <p className="text-xs text-muted">{batchProgress}</p>
            )}
          </div>
        </FadeUp>
      )}

      {loading && (
        <FadeUp delay={0.1}>
          <div className="space-y-4">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="min-h-[420px] w-full rounded-3xl" />
          </div>
        </FadeUp>
      )}

      {showEmpty && (
        <FlashcardsEmptyState
          canGenerateAll={canGenerateAll}
          onGenerateAll={() => void handleGenerateAll()}
          batchGenerating={batchGenerating}
          batchProgress={batchProgress}
        />
      )}

      {showFilteredEmpty && (
        <FadeUp delay={0.1}>
          <div className="rounded-3xl border border-white/[0.08] bg-card/50 py-12 text-center backdrop-blur-xl">
            <p className="text-sm text-muted">
              {statusFilter === 'due'
                ? 'All caught up — no cards due right now.'
                : 'No cards match this filter.'}
            </p>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'due' ? 'all' : 'due')}
              className="mt-4 text-sm text-accent hover:text-accent-soft transition-colors"
            >
              {statusFilter === 'due' ? 'Browse all cards' : 'Show due cards'}
            </button>
          </div>
        </FadeUp>
      )}

      {!loading && filteredCards.length > 0 && (
        <FlashcardDeck
          key={`${lectureFilter}-${statusFilter}-${filteredCards.map((c) => c.id).join(',')}`}
          cards={filteredCards}
          lectureTitles={lectureTitles}
          onReview={reviewCard}
          onDelete={handleDelete}
          lectures={lectures}
        />
      )}

      {!loading && flashcards.length > 0 && (
        <FadeUp delay={0.25}>
          <p className="mt-10 text-center text-xs text-muted">
            Spaced repetition schedules reviews automatically when you tap{' '}
            <span className="text-emerald">Got it</span> or{' '}
            <span className="text-accent">Still learning</span>.
          </p>
        </FadeUp>
      )}
    </DashboardPageShell>
  )
}
