import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { formatNextReview } from '@/lib/spacedRepetition'
import { isFlashcardDue } from '@/lib/flashcardStudy'
import type { Flashcard, ReviewRating } from '@/types/flashcard'
import { cn } from '@/lib/utils'
import { renderInlineText } from '@/components/shared/MarkdownRenderer'
import { FeedbackControls } from '@/components/shared/FeedbackControls'
import type { LectureRecording } from '@/types/lecture'

interface FlashcardDeckProps {
  cards: Flashcard[]
  lectureTitles: Record<string, string>
  onReview: (id: string, rating: ReviewRating) => Promise<Flashcard | null>
  onDelete: (id: string) => Promise<void>
  lectures?: LectureRecording[]
}

const STATUS_LABELS: Record<Flashcard['status'], string> = {
  new: 'New',
  review: 'Review',
  mastered: 'Mastered',
}

const STATUS_COLORS: Record<Flashcard['status'], string> = {
  new: 'text-sky-400 border-sky-400/25 bg-sky-400/[0.08]',
  review: 'text-accent border-accent/25 bg-accent/[0.08]',
  mastered: 'text-emerald border-emerald/25 bg-emerald/[0.08]',
}

export function FlashcardDeck({ cards, lectureTitles, onReview, onDelete, lectures = [] }: FlashcardDeckProps) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [direction, setDirection] = useState(0)
  const [marking, setMarking] = useState(false)
  const [lastReviewHint, setLastReviewHint] = useState<string | null>(null)

  const current = cards[index] ?? null
  const subject = lectures.find((l) => l.id === current?.lectureId)?.subject || null
  const progress = cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0

  const goTo = (nextIndex: number, dir: number) => {
    if (nextIndex < 0 || nextIndex >= cards.length) return
    setDirection(dir)
    setFlipped(false)
    setLastReviewHint(null)
    setIndex(nextIndex)
  }

  const handleReview = async (rating: ReviewRating) => {
    if (!current || marking) return
    setMarking(true)
    const updated = await onReview(current.id, rating)
    setMarking(false)
    setFlipped(false)

    if (updated) {
      const label = rating === 'good' ? 'Got it' : 'Still learning'
      setLastReviewHint(`${label} — next review ${formatNextReview(updated.nextReviewAt).toLowerCase()}`)
    }

    if (index < cards.length - 1) {
      goTo(index + 1, 1)
    }
  }

  if (!current) return null

  const lectureTitle = lectureTitles[current.lectureId] ?? 'Lecture'
  const dueNow = isFlashcardDue(current)

  return (
    <>
      <FadeUp delay={0.1}>
        <div className="mb-5 flex items-center justify-between text-sm text-muted">
          <span>
            Card {index + 1} of {cards.length}
          </span>
          <span>{Math.round(progress)}% through session</span>
        </div>
        <div className="mb-10 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent/80 to-emerald/80"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </FadeUp>

      <FadeUp delay={0.15}>
        <div className="relative perspective-[1200px]">
          <AmbientPageBackground variant="gold" className="rounded-3xl" />
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              initial={{
                opacity: 0,
                rotateY: direction === 0 ? (flipped ? -90 : 90) : direction * 90,
                x: direction * 40,
              }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{
                opacity: 0,
                rotateY: direction === 0 ? (flipped ? 90 : -90) : direction * -90,
                x: direction * -40,
              }}
              transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
              onClick={() => setFlipped((prev) => !prev)}
              className="relative cursor-pointer group"
            >
              <DashboardCard
                glow="gold"
                className="flashcard-card min-h-[420px] flex flex-col items-center justify-center text-center py-14 relative"
              >
                <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      STATUS_COLORS[current.status],
                    )}
                  >
                    {STATUS_LABELS[current.status]}
                  </span>
                  {dueNow && (
                    <span className="rounded-full border border-accent/25 bg-accent/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                      Due
                    </span>
                  )}
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] text-muted">
                    {lectureTitle}
                  </span>
                </div>

                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-accent mb-6">
                  {flipped ? 'Answer' : 'Question'}
                </p>

                <div className="max-w-lg px-6 text-lg leading-relaxed text-foreground md:text-xl">
                  {renderInlineText(flipped ? current.back : current.front)}
                </div>

                {current.concept && (
                  <p className="mt-6 text-xs text-muted/80">Concept: {current.concept}</p>
                )}

                {flipped && current.intervalDays > 0 && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-muted/80">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatNextReview(current.nextReviewAt)}
                  </p>
                )}

                <p className="mt-10 text-sm text-muted">Tap to flip</p>

                <div
                  className="absolute bottom-4 right-4 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FeedbackControls
                    contentType="flashcard"
                    contentId={current.id}
                    lectureId={current.lectureId}
                    subject={subject}
                    className="opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity duration-200"
                  />
                </div>
              </DashboardCard>
            </motion.div>
          </AnimatePresence>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="mt-8 flex flex-col items-center gap-4">
          {lastReviewHint && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-emerald/90"
            >
              {lastReviewHint}
            </motion.p>
          )}

          {flipped && (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={marking}
                onClick={() => void handleReview('hard')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/[0.08] px-5 py-2.5',
                  'text-sm font-medium text-accent transition-all hover:bg-accent/[0.12] disabled:opacity-50',
                )}
              >
                {marking ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Still learning
              </button>
              <button
                type="button"
                disabled={marking}
                onClick={() => void handleReview('good')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/[0.08] px-5 py-2.5',
                  'text-sm font-medium text-emerald transition-all hover:bg-emerald/[0.12] disabled:opacity-50',
                )}
              >
                {marking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Got it
              </button>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goTo(index - 1, -1)}
              disabled={index === 0}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08]',
                'text-muted hover:text-foreground hover:border-accent/25 hover:-translate-y-0.5',
                'transition-all duration-300 disabled:opacity-30 disabled:hover:translate-y-0',
              )}
              aria-label="Previous card"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setFlipped((prev) => !prev)}
              className={cn(
                'flex h-12 items-center gap-2 rounded-xl border border-white/[0.08] px-5 text-sm text-muted',
                'hover:text-accent hover:border-accent/25 hover:-translate-y-0.5 transition-all duration-300',
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Flip
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1, 1)}
              disabled={index >= cards.length - 1}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08]',
                'text-muted hover:text-foreground hover:border-accent/25 hover:-translate-y-0.5',
                'transition-all duration-300 disabled:opacity-30 disabled:hover:translate-y-0',
              )}
              aria-label="Next card"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void onDelete(current.id)}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08]',
                'text-muted hover:text-red-400 hover:border-red-400/25 transition-all duration-300',
              )}
              aria-label="Delete card"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </FadeUp>
    </>
  )
}
