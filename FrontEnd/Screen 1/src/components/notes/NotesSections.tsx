import { useState, useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Brain,
  Eye,
  EyeOff,
  MessageSquare,
  Sparkles,
  Star,
  AlertTriangle,
  HelpCircle,
  BookOpen,
  CheckCircle2
} from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import { useDashboard } from '@/context/DashboardContext'
import { generateFlashcards } from '@/services/aiGenerationService'
import { createFlashcards } from '@/services/flashcardService'
import { useTypewriter } from '@/components/effects/TypewriterText'
import { MarkdownRenderer, renderInlineText } from '@/components/shared/MarkdownRenderer'
import { FeedbackControls } from '@/components/shared/FeedbackControls'
import type {
  Definition,
  ExamTips,
  KeyConcept,
  NoteExample,
  QuestionDifficulty,
  StudyQuestion,
} from '@/types/notes'
import { cn } from '@/lib/utils'

function SectionShell({
  title,
  subtitle,
  children,
  className,
  onClick,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div className={cn('space-y-6', className)} onClick={onClick}>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-accent/80">
          {title}
        </p>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export function SummarySection({ summary, lectureId, subject }: { summary: string; lectureId: string; subject?: string | null }) {
  const paragraphs = useMemo(() => summary.split(/\n\n+/).filter(Boolean), [summary])
  const { displayedBlocks, isComplete, skip } = useTypewriter(
    paragraphs,
    `${lectureId}-summary`
  )

  const revealedText = useMemo(() => {
    return displayedBlocks.filter(Boolean).join('\n\n')
  }, [displayedBlocks])

  // Parse the summary text into sections
  const parsed = useMemo(() => {
    const sections = {
      summary: '',
      keyTopics: [] as { title: string; body: string }[],
      keyTakeaways: [] as string[],
    }

    if (!revealedText) return sections

    // Split by ### followed by a heading line
    const parts = revealedText.split(/(?=###\s+)/)

    for (const part of parts) {
      const lines = part.split('\n')
      const headingLine = lines[0] || ''
      const content = lines.slice(1).join('\n').trim()

      if (headingLine.includes('Summary') || headingLine.includes('Core Theme')) {
        sections.summary = content
      } else if (headingLine.includes('Key Topics') || headingLine.includes('Topics')) {
        const subtopics: { title: string; body: string }[] = []
        const topicMatches = content.split(/(?=\d+\.\s+)/)
        for (const tm of topicMatches) {
          const trimmedTm = tm.trim()
          if (!trimmedTm) continue
          
          const match = trimmedTm.match(/^\d+\.\s+\*\*(.*?)\*\*[:\s—–-]+\s*([\s\S]*)$/)
          if (match) {
            subtopics.push({
              title: match[1].trim(),
              body: match[2].trim()
            })
          } else {
            const firstLineBreak = trimmedTm.indexOf('\n')
            const titleLine = firstLineBreak !== -1 ? trimmedTm.substring(0, firstLineBreak) : trimmedTm
            const bodyText = firstLineBreak !== -1 ? trimmedTm.substring(firstLineBreak + 1) : ''
            
            const titleClean = titleLine.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '').replace(/[:\s—–-]+$/, '').trim()
            subtopics.push({
              title: titleClean || 'Topic',
              body: bodyText.trim() || titleLine
            })
          }
        }
        sections.keyTopics = subtopics
      } else if (headingLine.includes('Key Takeaways') || headingLine.includes('Takeaways') || headingLine.includes('Next Steps')) {
        const takeaways: string[] = []
        const bulletLines = content.split('\n')
        for (const line of bulletLines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
            const cleanText = trimmedLine
              .replace(/^[-*]\s*(\[[\s_xX]?\])?\s*/, '')
              .trim()
            if (cleanText) {
              takeaways.push(cleanText)
            }
          }
        }
        if (takeaways.length === 0 && content) {
          takeaways.push(content)
        }
        
        if (sections.keyTakeaways.length === 0) {
          sections.keyTakeaways = takeaways
        } else {
          sections.keyTakeaways = [...sections.keyTakeaways, ...takeaways]
        }
      }
    }

    // Fallback if no headings matched (e.g. legacy notes, plain text format)
    if (!sections.summary && !sections.keyTopics.length && !sections.keyTakeaways.length) {
      sections.summary = revealedText
    }

    return sections
  }, [revealedText])

  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  // Determine typing cursor placement
  const showCursorInSummary = !isComplete && !parsed.keyTopics.length && !parsed.keyTakeaways.length
  const showCursorInTopicsIdx = !isComplete && parsed.keyTopics.length > 0 && !parsed.keyTakeaways.length ? parsed.keyTopics.length - 1 : -1
  const showCursorInTakeawaysIdx = !isComplete && parsed.keyTakeaways.length > 0 ? parsed.keyTakeaways.length - 1 : -1

  return (
    <SectionShell title="Summary" subtitle="Short overview of your lecture" onClick={skip}>
      <div className="relative group/summary space-y-6">
        {/* 1. Summary Overview Card */}
        {parsed.summary && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-accent/[0.03] to-transparent p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-accent/80">Overview</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 font-medium">
              {renderInlineText(parsed.summary, showCursorInSummary)}
            </p>
          </div>
        )}

        {/* 2. Key Topics Cards */}
        {parsed.keyTopics.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Key Topics</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pl-[34px]">
              {parsed.keyTopics.map((topic, idx) => (
                <div 
                  key={idx}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-300 hover:border-accent/25 hover:bg-accent/[0.04]"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold text-xs border border-accent/20">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors duration-200">
                      {topic.title}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    {renderInlineText(topic.body, showCursorInTopicsIdx === idx)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Key Takeaways Checklist */}
        {parsed.keyTakeaways.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Key Takeaways</h3>
            </div>
            <div className="space-y-2.5 pl-[34px]">
              {parsed.keyTakeaways.map((takeaway, idx) => {
                const isChecked = !!checkedItems[idx]
                return (
                  <div 
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer select-none"
                  >
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200",
                      isChecked 
                        ? "border-accent bg-accent/20 text-accent" 
                        : "border-white/20 bg-transparent text-transparent hover:border-white/40"
                    )}>
                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <span className={cn(
                      "text-sm text-foreground/80 transition-all duration-200",
                      isChecked && "line-through text-muted/65"
                    )}>
                      {renderInlineText(takeaway, showCursorInTakeawaysIdx === idx)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <FeedbackControls
            contentType="summary"
            contentId="summary"
            lectureId={lectureId}
            subject={subject}
          />
        </div>
      </div>
    </SectionShell>
  )
}

interface ConceptsSectionProps {
  concepts: KeyConcept[]
  importantPoints: string[]
  transcriptText: string | null
  lectureId: string
}

export function ConceptsSection({
  concepts,
  importantPoints,
  transcriptText,
  lectureId,
}: ConceptsSectionProps) {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { openTutor } = useDashboard()

  const handleAsk = (concept: KeyConcept) => {
    openTutor(`Explain this concept in more detail: ${concept.title}`)
  }

  const handleFlashcards = async (concept: KeyConcept) => {
    if (!transcriptText) return
    try {
      const cards = await generateFlashcards(
          `${transcriptText}\n\nFocus on: ${concept.title} — ${concept.explanation}`,
      )
      if (cards.length > 0 && user) {
        await createFlashcards(
            user.uid,
            lectureId,
            cards.map((card) => ({ ...card, concept: concept.title })),
        )
        toast.success(`${cards.length} flashcards for "${concept.title}" saved to your deck.`)
      } else {
        toast.success(`${cards.length} flashcards for "${concept.title}".`)
      }
    } catch {
      toast.error('Flashcard generation failed.')
    }
  }

  const blocks = useMemo(() => {
    return [
      ...importantPoints,
      ...concepts.map((c) => c.explanation),
    ]
  }, [importantPoints, concepts])

  const { displayedBlocks, currentBlockIndex, isComplete, skip } = useTypewriter(
    blocks,
    `${lectureId}-concepts`
  )

  return (
    <SectionShell title="Key Concepts" subtitle="Core ideas from your lecture" onClick={skip}>
      <div className="space-y-6 cursor-pointer">
        {importantPoints.length > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Important Points</h3>
            </div>
            <div className="pl-[34px] mt-2 space-y-2.5">
              {importantPoints.map((_, index) => {
                const displayedText = displayedBlocks[index]
                if (!displayedText) return null
                const isCurrent = index === currentBlockIndex
                const showCursor = isCurrent && !isComplete

                return (
                  <div key={index} className="flex gap-2.5 leading-[1.75] text-[14px] text-foreground/70">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" />
                    <span>
                      {renderInlineText(displayedText, showCursor)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {concepts.length > 0 && (
          <div>
            {importantPoints.length > 0 && <hr className="border-t-[0.5px] border-white/10 my-6" />}
            <div className="flex items-center gap-2">
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Brain className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Key Concepts</h3>
            </div>
            <div className="pl-[34px] mt-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {concepts.map((concept, index) => {
                  const blockIndex = importantPoints.length + index
                  const displayedExplanation = displayedBlocks[blockIndex]
                  if (!displayedExplanation) return null
                  const isCurrent = blockIndex === currentBlockIndex
                  const showCursor = isCurrent && !isComplete

                  return (
                    <motion.article
                      key={`${concept.title}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5',
                        'transition-all duration-300 hover:border-accent/25 hover:bg-accent/[0.04]',
                        'hover:shadow-[0_0_32px_rgba(var(--color-accent-rgb),0.08)]',
                      )}
                    >
                      <h3 className="text-sm font-semibold text-foreground">{concept.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                        {renderInlineText(displayedExplanation, showCursor)}
                      </p>
                      <p className="mt-3 text-xs text-accent/90">
                        <span className="font-medium">Why it matters:</span> {concept.importance}
                      </p>

                      <div
                        className={cn(
                          'mt-4 flex gap-2 opacity-0 transition-opacity duration-300',
                          'group-hover:opacity-100',
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleAsk(concept)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-ambient/25 bg-ambient/[0.08] px-3 py-1.5 text-xs text-ambient cursor-pointer hover:bg-ambient/[0.12]"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Ask AI
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleFlashcards(concept)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-xs text-accent cursor-pointer hover:bg-accent/[0.12]"
                        >
                          <Brain className="h-3 w-3" />
                          Flashcards
                        </button>
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

export function DefinitionsSection({
  definitions,
  lectureId,
}: {
  definitions: Definition[]
  lectureId: string
}) {
  const blocks = useMemo(() => definitions.map((d) => d.definition), [definitions])
  const { displayedBlocks, currentBlockIndex, isComplete, skip } = useTypewriter(
    blocks,
    `${lectureId}-definitions`
  )

  return (
    <SectionShell title="Definitions" subtitle="Terms explained simply" onClick={skip}>
      <div className="space-y-6 cursor-pointer">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <BookOpen className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Key Definitions</h3>
          </div>
          <div className="pl-[34px] mt-3 space-y-4">
            {definitions.map((def, index) => {
              const displayedDef = displayedBlocks[index]
              if (!displayedDef) return null
              const isCurrent = index === currentBlockIndex
              const showCursor = isCurrent && !isComplete

              return (
                <motion.div
                  key={`${def.term}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
                >
                  <p className="text-base font-semibold text-accent">{renderInlineText(def.term)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                    {renderInlineText(displayedDef, showCursor)}
                  </p>
                  <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Example</p>
                    <p className="mt-1 text-sm text-foreground/80">{renderInlineText(def.example)}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

export function ExamplesSection({ examples }: { examples: NoteExample[] }) {
  return (
    <SectionShell title="Examples" subtitle="Real illustrations from the lecture">
      <div className="space-y-4">
        {examples.map((example, index) => (
          <motion.div
            key={`${example.title}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-accent/[0.03] to-transparent p-5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <h3 className="text-base font-semibold text-foreground">{example.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{example.description}</p>
            <p className="mt-3 text-xs text-muted">
              <span className="text-accent/80">Context:</span> {example.context}
            </p>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}

const DIFFICULTY_STYLES: Record<QuestionDifficulty, string> = {
  easy: 'border-emerald/25 bg-emerald/[0.06] text-emerald',
  medium: 'border-accent/25 bg-accent/[0.06] text-accent',
  hard: 'border-red/25 bg-red/[0.06] text-red',
}

interface QuestionsSectionProps {
  questions: StudyQuestion[]
  transcriptText: string | null
  lectureId: string
  subject?: string | null
}

export function QuestionsSection({ questions, lectureId, subject }: QuestionsSectionProps) {
  const { openTutor } = useDashboard()
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | QuestionDifficulty>('all')
  const [answered, setAnswered] = useState<Set<number>>(new Set())

  const questionsWithAbsoluteIndex = useMemo(() => {
    return questions.map((q, idx) => ({ ...q, originalIndex: idx }))
  }, [questions])

  const grouped: Record<QuestionDifficulty, Array<StudyQuestion & { originalIndex: number }>> = {
    easy: [],
    medium: [],
    hard: [],
  }

  questionsWithAbsoluteIndex.forEach((q) => {
    const key = q.difficulty in grouped ? q.difficulty : 'medium'
    grouped[key].push(q)
  })

  const toggleReveal = (index: number) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    setAnswered((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }

  const handleAsk = (question: StudyQuestion) => {
    openTutor(`Help me understand this question better: ${question.question}`)
  }

  const blocks = useMemo(() => questions.map((q) => q.question), [questions])
  const { displayedBlocks, currentBlockIndex, isComplete, skip } = useTypewriter(
    blocks,
    `${lectureId}-questions`
  )

  return (
    <SectionShell title="Questions" subtitle="Practice at easy, medium, and hard levels" onClick={skip}>
      <div className="space-y-6 cursor-pointer">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <HelpCircle className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Practice Questions</h3>
            </div>

            {/* Difficulty Filter Pills */}
            <div className="rounded-full bg-[#121212] border border-white/[0.08] p-1 flex gap-1 items-center max-w-max self-start sm:self-auto select-none">
              {(['all', 'easy', 'medium', 'hard'] as const).map((filter) => {
                const isActive = difficultyFilter === filter
                let count = 0
                if (filter === 'all') {
                  count = questions.length
                } else {
                  count = grouped[filter]?.length || 0
                }

                const label = filter === 'all' ? `All (${count})` : filter.charAt(0).toUpperCase() + filter.slice(1)

                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setDifficultyFilter(filter)}
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'bg-[#1A2A12] text-[#97C459]'
                        : 'bg-transparent text-[#6B6B6B] hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pl-[34px] mt-3 space-y-[20px]">
            {(['easy', 'medium', 'hard'] as QuestionDifficulty[])
              .filter((d) => difficultyFilter === 'all' || d === difficultyFilter)
              .map((difficulty) => {
                const items = grouped[difficulty]
                if (!items.length) return null

                return (
                  <div key={difficulty} className="space-y-[10px]">
                    {/* Section Header with Count and Divider */}
                    <div className="flex items-center gap-3 w-full my-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted shrink-0">{difficulty}</span>
                      <span className="text-[10px] text-[#6B6B6B] shrink-0 font-medium">
                        {items.length} {items.length === 1 ? 'question' : 'questions'}
                      </span>
                      <div className="h-px bg-white/[0.06] flex-1" />
                    </div>

                    {items.map((question) => {
                      const index = question.originalIndex
                      const isRevealed = revealed.has(index)
                      const displayedQuestion = displayedBlocks[index]
                      if (!displayedQuestion) return null
                      const isCurrent = index === currentBlockIndex
                      const showCursor = isCurrent && !isComplete
                      const hasAnswered = answered.has(index)

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="relative group/question rounded-2xl border border-white/[0.08] bg-white/[0.02] p-[18px]"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span
                              className={cn(
                                'inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                                DIFFICULTY_STYLES[difficulty],
                              )}
                            >
                              {difficulty}
                            </span>

                            {/* Answered / Not Answered Status */}
                            <div className="flex items-center gap-1.5 text-[11px] font-medium select-none">
                              {hasAnswered ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[#97C459]" />
                                  <span className="text-[#97C459]">answered</span>
                                </>
                              ) : (
                                <>
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#4A4A4A]" />
                                  <span className="text-[#4A4A4A]">not answered</span>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="mt-3 text-sm font-medium text-foreground">
                            {renderInlineText(displayedQuestion, showCursor)}
                          </p>

                          {isRevealed && (
                            <motion.p
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-3 rounded-xl border border-accent/15 bg-accent/[0.04] px-4 py-3 text-sm text-foreground/90"
                            >
                              {renderInlineText(question.answer)}
                            </motion.p>
                          )}

                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleReveal(index)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-xs text-accent font-medium cursor-pointer hover:bg-accent/[0.12]"
                              >
                                {isRevealed ? (
                                  <>
                                    <EyeOff className="h-3.5 w-3.5" /> Hide answer
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3.5 w-3.5" /> Reveal answer
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleAsk(question)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-ambient/25 bg-ambient/[0.08] px-3 py-1.5 text-xs text-ambient font-medium cursor-pointer hover:bg-ambient/[0.12]"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Ask AI
                              </button>
                            </div>

                            <FeedbackControls
                              contentType="quiz_question"
                              contentId={question.question}
                              lectureId={lectureId}
                              subject={subject}
                              className="opacity-100"
                            />
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </SectionShell>
  )
}

export function ExamTipsSection({ examTips, lectureId }: { examTips: ExamTips; lectureId: string }) {
  const blocks = useMemo(() => {
    return [
      ...examTips.mostImportant,
      ...examTips.commonMistakes,
      ...examTips.topicsToRevise,
    ]
  }, [examTips])

  const { displayedBlocks, currentBlockIndex, isComplete, skip } = useTypewriter(
    blocks,
    `${lectureId}-examtips`
  )

  const items = [
    { title: 'Most Important Ideas', key: 'mostImportant', items: examTips.mostImportant, icon: Star },
    { title: 'Potential Mistakes', key: 'commonMistakes', items: examTips.commonMistakes, icon: AlertTriangle },
    { title: 'Topics to Revise', key: 'topicsToRevise', items: examTips.topicsToRevise, icon: Brain },
  ]

  let runningIndex = 0

  return (
    <SectionShell
      title="Exam Tips"
      subtitle="Focus on what matters — no mark predictions"
      onClick={skip}
    >
      <div className="space-y-6 cursor-pointer">
        {items.map((block, blockIndex) => {
          if (!block.items.length) return null
          const Icon = block.icon

          // Render only items that have started revealing
          const blockStartIdx = runningIndex
          const blockEndIdx = runningIndex + block.items.length
          runningIndex = blockEndIdx

          const renderedItems = block.items.map((_, idx) => {
            const globalIdx = blockStartIdx + idx
            const text = displayedBlocks[globalIdx]
            return { text, globalIdx }
          }).filter(r => r.text)

          if (renderedItems.length === 0) return null

          const isWarning = block.key === 'commonMistakes'

          const listContent = (
            <div className="space-y-2.5">
              {renderedItems.map((rendered) => {
                const isCurrent = rendered.globalIdx === currentBlockIndex
                const showCursor = isCurrent && !isComplete
                return (
                  <div key={rendered.globalIdx} className="flex gap-2.5 text-[14px] leading-[1.75] text-foreground/70">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" />
                    <span>
                      {renderInlineText(rendered.text, showCursor)}
                    </span>
                  </div>
                )
              })}
            </div>
          )

          return (
            <div key={block.title}>
              {blockIndex > 0 && <hr className="border-t-[0.5px] border-white/10 my-6" />}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                </div>
                <div className="pl-[34px] mt-2">
                  {isWarning ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200/90">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-1" />
                      <div className="flex-1 text-sm text-amber-200/80 leading-relaxed">
                        {listContent}
                      </div>
                    </div>
                  ) : (
                    listContent
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
