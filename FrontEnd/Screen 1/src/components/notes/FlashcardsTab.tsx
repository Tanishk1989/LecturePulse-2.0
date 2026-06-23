import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, HelpCircle, ArrowRight, CheckCircle2, RotateCcw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { generateFlashcards } from '@/services/aiGenerationService'
import { renderInlineText } from '@/components/shared/MarkdownRenderer'
import { FeedbackControls } from '@/components/shared/FeedbackControls'
import {
  getFlashcardsByLectureId,
  createFlashcards,
  reviewFlashcard,
} from '@/services/flashcardService'
import type { Flashcard } from '@/types/flashcard'
import type { ReviewRating } from '@/types/flashcard'
import { cn } from '@/lib/utils'

const DIFFICULTY_STYLES = {
  easy: 'border-emerald/25 bg-emerald/[0.06] text-emerald',
  medium: 'border-accent/25 bg-accent/[0.06] text-accent',
  hard: 'border-red/25 bg-red/[0.06] text-red',
}

interface FlashcardsTabProps {
  lectureId: string
  transcriptText: string | null
  subject?: string | null
}

export function FlashcardsTab({ lectureId, transcriptText, subject }: FlashcardsTabProps) {
  const { user } = useAuthContext()
  const { toast } = useToast()

  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  
  // Study session states
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studiedCount, setStudiedCount] = useState(0)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [needReviewCards, setNeedReviewCards] = useState<Set<string>>(new Set())

  const fetchCards = async () => {
    if (!user) return
    setLoading(true)
    try {
      const lectureCards = await getFlashcardsByLectureId(user.uid, lectureId)
      setCards(lectureCards)
    } catch {
      toast.error('Failed to load flashcards.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCards()
  }, [lectureId, user])

  const handleGenerate = async () => {
    if (!transcriptText || !user) return
    setGenerating(true)
    try {
      const generated = await generateFlashcards(transcriptText)
      if (generated.length === 0) {
        toast.error('AI did not return any flashcards. Please try again.')
        return
      }

      const saved = await createFlashcards(user.uid, lectureId, generated)
      setCards(saved)
      setCurrentIndex(0)
      setIsFlipped(false)
      setStudiedCount(0)
      toast.success(`Successfully generated and saved ${saved.length} flashcards.`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate flashcards.')
    } finally {
      setGenerating(false)
    }
  }

  const handleReview = async (rating: ReviewRating) => {
    if (!user || cards.length === 0) return
    const card = cards[currentIndex]

    // Track locally for session stats
    if (rating === 'good') {
      setKnownCards((prev) => {
        const next = new Set(prev)
        next.add(card.id)
        return next
      })
      setNeedReviewCards((prev) => {
        const next = new Set(prev)
        next.delete(card.id)
        return next
      })
    } else {
      setNeedReviewCards((prev) => {
        const next = new Set(prev)
        next.add(card.id)
        return next
      })
      setKnownCards((prev) => {
        const next = new Set(prev)
        next.delete(card.id)
        return next
      })
    }
    
    // Optimistic state update
    setIsFlipped(false)
    setStudiedCount((prev) => prev + 1)
    setTimeout(() => {
      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setCurrentIndex(cards.length) // Completed session state
      }
    }, 200)

    try {
      await reviewFlashcard(card.id, user.uid, rating)
    } catch {
      toast.error('Failed to submit review.')
    }
  }

  const resetSession = () => {
    setCurrentIndex(0)
    setIsFlipped(false)
    setStudiedCount(0)
    setKnownCards(new Set())
    setNeedReviewCards(new Set())
  }

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted">Retrieving flashcards...</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-[#090909]/50 p-8 text-center md:py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.05] text-accent">
          <Brain className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">No Flashcards Yet</h3>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Generate premium active-recall flashcards directly from your lecture transcript to test your memory.
        </p>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating || !transcriptText}
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background',
            'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.25)] transition-all cursor-pointer hover:bg-accent-soft',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating deck...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Generate Flashcards
            </>
          )}
        </button>
      </div>
    )
  }

  const isSessionFinished = currentIndex >= cards.length

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
          Flashcards
        </p>
        <p className="mt-2 text-sm text-muted">
          Interactive study deck with active recall spaced repetition.
        </p>
      </div>

      <div className="mx-auto w-full max-w-md">
        <AnimatePresence mode="wait">
          {isSessionFinished ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-[#0E0E0E]/90 p-8 text-center shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald/15 text-emerald">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">Session Completed!</h3>
              <p className="mt-2 text-sm text-muted">
                You studied {studiedCount} flashcards in this session. Keep up the great work!
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={resetSession}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 text-xs font-semibold hover:bg-white/[0.08] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restart Session
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generating || !transcriptText}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-xs font-semibold text-background hover:bg-accent-soft cursor-pointer disabled:opacity-40"
                >
                  {generating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Brain className="h-3.5 w-3.5" />
                  )}
                  Regenerate Deck
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Progress Indicator */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-muted px-1">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span>Session progress: {Math.round((currentIndex / cards.length) * 100)}%</span>
                </div>
                <div className="h-1 w-full rounded-full bg-[#1A1A1A] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#97C459] transition-all duration-300"
                    style={{ width: `${(currentIndex / cards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Flashcard Capsule */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={cn(
                  'relative h-64 w-full cursor-pointer rounded-3xl border border-white/[0.08] bg-[#0E0E0E]/90 shadow-xl',
                  'flex flex-col items-center justify-center py-8 px-7 text-center select-none overflow-hidden group',
                  'transition-all duration-300 hover:border-accent/20'
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.01] via-transparent to-ambient/[0.02]" />

                {/* Difficulty Badge */}
                {(() => {
                  const difficulties = ['easy', 'medium', 'hard'] as const
                  const cardId = cards[currentIndex]?.id || ''
                  const difficultyIndex = cardId ? (cardId.charCodeAt(0) % 3) : 1
                  const difficulty = difficulties[difficultyIndex]
                  return (
                    <div className="absolute top-4 left-4 flex items-center justify-between z-10 pointer-events-none">
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          DIFFICULTY_STYLES[difficulty],
                        )}
                      >
                        {difficulty}
                      </span>
                    </div>
                  )
                })()}

                <AnimatePresence mode="wait">
                  {!isFlipped ? (
                    <motion.div
                      key="front"
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: 90 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center w-full"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 text-accent/80 mb-4 shrink-0">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <p className="text-base font-semibold text-foreground leading-relaxed px-4">
                        {renderInlineText(cards[currentIndex].front)}
                      </p>
                      <span className="mt-6 text-[10px] uppercase font-bold tracking-widest text-muted/60">
                        Click card to flip
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0, rotateY: 90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      exit={{ opacity: 0, rotateY: -90 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center w-full"
                    >
                      <CheckCircle2 className="h-8 w-8 text-emerald/60 mb-4" />
                      <p className="text-base font-semibold text-foreground leading-relaxed px-4">
                        {renderInlineText(cards[currentIndex].back)}
                      </p>
                      <span className="mt-6 text-[10px] uppercase font-bold tracking-widest text-muted/60">
                        Rate difficulty below to continue
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <FeedbackControls
                  contentType="flashcard"
                  contentId={cards[currentIndex].id}
                  lectureId={lectureId}
                  subject={subject}
                  className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity duration-200"
                />
              </div>

              {/* Swiper Controls with Prev/Next buttons */}
              <div className="flex gap-2 justify-between items-center w-full">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCurrentIndex((prev) => prev - 1)
                    setIsFlipped(false)
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-transparent px-4 text-xs font-semibold text-[#6B6B6B] hover:text-foreground hover:border-white/[0.16] transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {!isFlipped ? (
                  <button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full border border-accent/20 bg-accent/[0.05] px-6 text-sm font-semibold text-accent hover:bg-accent/[0.12] transition-all cursor-pointer"
                  >
                    Reveal Answer
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReview('hard')}
                      className="flex h-11 items-center justify-center rounded-full border border-red/25 bg-red/[0.05] text-xs font-semibold text-red hover:bg-red/[0.12] cursor-pointer"
                    >
                      Study Again
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReview('good')}
                      className="flex h-11 items-center justify-center rounded-full border border-emerald/25 bg-emerald/[0.05] text-xs font-semibold text-emerald hover:bg-emerald/[0.12] cursor-pointer"
                    >
                      Got It!
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (currentIndex === cards.length - 1) {
                      setCurrentIndex(cards.length) // Completed session state
                    } else {
                      setCurrentIndex((prev) => prev + 1)
                      setIsFlipped(false)
                    }
                  }}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/[0.08] bg-transparent px-4 text-xs font-semibold text-foreground/80 hover:text-foreground hover:border-white/[0.16] transition-all cursor-pointer shrink-0"
                >
                  {currentIndex === cards.length - 1 ? 'Finish' : 'Next'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Session Stats Tracker */}
              {(() => {
                const knownCount = knownCards.size
                const reviewCount = needReviewCards.size
                const remainingCount = cards.filter((c) => !knownCards.has(c.id) && !needReviewCards.has(c.id)).length
                return (
                  <div className="flex items-center justify-center gap-5 mt-4 text-xs font-semibold text-muted select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#97C459]" />
                      <span>known: {knownCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span>review again: {reviewCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#6B6B6B]" />
                      <span>remaining: {remainingCount}</span>
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
