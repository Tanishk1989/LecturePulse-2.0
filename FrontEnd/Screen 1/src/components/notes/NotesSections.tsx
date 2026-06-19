import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Brain, ChevronDown, Eye, EyeOff, MessageSquare, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import { askAboutNotes, generateFlashcards } from '@/services/aiGenerationService'
import { createFlashcards } from '@/services/flashcardService'
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
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
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

export function SummarySection({ summary }: { summary: string }) {
  const paragraphs = summary.split(/\n\n+/).filter(Boolean)

  return (
    <SectionShell title="Summary" subtitle="Short overview of your lecture">
      <div className="space-y-4">
        {paragraphs.map((paragraph, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="text-[15px] leading-[1.8] text-foreground/90"
          >
            {paragraph}
          </motion.p>
        ))}
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

  const handleAsk = async (concept: KeyConcept) => {
    if (!transcriptText) return
    try {
      const answer = await askAboutNotes(
        transcriptText,
        `Explain this concept in more detail: ${concept.title}`,
        `${concept.title}: ${concept.explanation}`,
      )
      toast.success(answer.slice(0, 120) + (answer.length > 120 ? '…' : ''))
    } catch {
      toast.error('Could not reach AI.')
    }
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

  return (
    <SectionShell title="Key Concepts" subtitle="Core ideas from your lecture">
      {importantPoints.length > 0 && (
        <div className="rounded-2xl border border-accent/15 bg-accent/[0.04] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent/80">
            Important Points
          </p>
          <ul className="space-y-2">
            {importantPoints.map((point, index) => (
              <li key={index} className="flex gap-2 text-sm text-foreground/90">
                <span className="text-accent">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {concepts.map((concept, index) => (
          <motion.article
            key={`${concept.title}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5',
              'transition-all duration-300 hover:border-accent/25 hover:bg-accent/[0.04]',
              'hover:shadow-[0_0_32px_rgba(214,162,11,0.08)]',
            )}
          >
            <h3 className="text-base font-semibold text-foreground">{concept.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{concept.explanation}</p>
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
                onClick={() => void handleAsk(concept)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ambient/25 bg-ambient/[0.08] px-3 py-1.5 text-xs text-ambient cursor-pointer hover:bg-ambient/[0.12]"
              >
                <MessageSquare className="h-3 w-3" />
                Ask AI
              </button>
              <button
                type="button"
                onClick={() => void handleFlashcards(concept)}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.08] px-3 py-1.5 text-xs text-accent cursor-pointer hover:bg-accent/[0.12]"
              >
                <Brain className="h-3 w-3" />
                Flashcards
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  )
}

export function DefinitionsSection({ definitions }: { definitions: Definition[] }) {
  return (
    <SectionShell title="Definitions" subtitle="Terms explained simply">
      <div className="space-y-4">
        {definitions.map((def, index) => (
          <motion.div
            key={`${def.term}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
          >
            <p className="text-lg font-semibold text-accent">{def.term}</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{def.definition}</p>
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Example</p>
              <p className="mt-1 text-sm text-foreground/80">{def.example}</p>
            </div>
          </motion.div>
        ))}
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
}

export function QuestionsSection({ questions, transcriptText }: QuestionsSectionProps) {
  const { toast } = useToast()
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  const grouped: Record<QuestionDifficulty, StudyQuestion[]> = {
    easy: [],
    medium: [],
    hard: [],
  }

  questions.forEach((q) => {
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
  }

  const handleAsk = async (question: StudyQuestion) => {
    if (!transcriptText) return
    try {
      const answer = await askAboutNotes(
        transcriptText,
        `Help me understand this question better: ${question.question}`,
      )
      toast.success(answer.slice(0, 140) + (answer.length > 140 ? '…' : ''))
    } catch {
      toast.error('Could not reach AI.')
    }
  }

  let globalIndex = 0

  return (
    <SectionShell title="Questions" subtitle="Practice at easy, medium, and hard levels">
      {(['easy', 'medium', 'hard'] as QuestionDifficulty[]).map((difficulty) => {
        const items = grouped[difficulty]
        if (!items.length) return null

        return (
          <div key={difficulty} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{difficulty}</p>
            {items.map((question) => {
              const index = globalIndex
              globalIndex += 1
              const isRevealed = revealed.has(index)

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
                >
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      DIFFICULTY_STYLES[difficulty],
                    )}
                  >
                    {difficulty}
                  </span>
                  <p className="mt-3 text-sm font-medium text-foreground">{question.question}</p>

                  <button
                    type="button"
                    onClick={() => toggleReveal(index)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent cursor-pointer hover:text-accent-soft"
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

                  {isRevealed && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 rounded-xl border border-accent/15 bg-accent/[0.04] px-4 py-3 text-sm text-foreground/90"
                    >
                      {question.answer}
                    </motion.p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleAsk(question)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-ambient cursor-pointer hover:text-ambient/80"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Ask AI
                  </button>
                </motion.div>
              )
            })}
          </div>
        )
      })}
    </SectionShell>
  )
}

export function ExamTipsSection({ examTips }: { examTips: ExamTips }) {
  const blocks = [
    { title: 'Most Important Ideas', items: examTips.mostImportant, icon: Sparkles },
    { title: 'Potential Mistakes', items: examTips.commonMistakes, icon: ChevronDown },
    { title: 'Topics to Revise', items: examTips.topicsToRevise, icon: Brain },
  ]

  return (
    <SectionShell
      title="Exam Tips"
      subtitle="Focus on what matters — no mark predictions"
    >
      <div className="space-y-4">
        {blocks.map((block, index) => {
          if (!block.items.length) return null
          const Icon = block.icon
          return (
            <motion.div
              key={block.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-ambient/20 bg-ambient/[0.04] p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-ambient" />
                <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
              </div>
              <ul className="space-y-2">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-2 text-sm text-foreground/85">
                    <span className="text-ambient">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          )
        })}
      </div>
    </SectionShell>
  )
}
