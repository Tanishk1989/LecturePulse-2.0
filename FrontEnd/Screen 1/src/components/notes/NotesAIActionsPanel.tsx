import { Link } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, ClipboardCopy, ExternalLink, FileDown, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import {
  askAboutNotes,
  formatNotesForCopy,
  generateFlashcards,
} from '@/services/aiGenerationService'
import { createFlashcards } from '@/services/flashcardService'
import type { FlashcardInput } from '@/types/flashcard'
import type { StructuredNotesContent } from '@/types/notes'
import { cn } from '@/lib/utils'

interface NotesAIActionsPanelProps {
  lectureId: string
  transcriptText: string | null
  notesContent: StructuredNotesContent | null
  className?: string
}

export function NotesAIActionsPanel({
  lectureId,
  transcriptText,
  notesContent,
  className,
}: NotesAIActionsPanelProps) {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [askDraft, setAskDraft] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askAnswer, setAskAnswer] = useState<string | null>(null)
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [flashcards, setFlashcards] = useState<FlashcardInput[]>([])
  const [flashcardsSaved, setFlashcardsSaved] = useState(false)

  const handleAsk = async () => {
    const question = askDraft.trim()
    if (!question || !transcriptText) return
    setAskLoading(true)
    setAskAnswer(null)
    try {
      const context = notesContent ? formatNotesForCopy(notesContent).slice(0, 3000) : undefined
      const answer = await askAboutNotes(transcriptText, question, context)
      setAskAnswer(answer)
      setAskDraft('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI request failed.')
    } finally {
      setAskLoading(false)
    }
  }

  const handleFlashcards = async () => {
    if (!transcriptText) return
    setFlashcardsLoading(true)
    setFlashcardsSaved(false)
    try {
      const cards = await generateFlashcards(transcriptText)
      setFlashcards(cards)

      if (cards.length > 0 && user) {
        await createFlashcards(user.uid, lectureId, cards)
        setFlashcardsSaved(true)
        toast.success(`${cards.length} flashcards saved to your deck.`)
      } else {
        toast.success(`${cards.length} flashcards generated.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Flashcard generation failed.')
    } finally {
      setFlashcardsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!notesContent) return
    try {
      await navigator.clipboard.writeText(formatNotesForCopy(notesContent))
      toast.success('Notes copied to clipboard.')
    } catch {
      toast.error('Could not copy notes.')
    }
  }

  const handleExportPdf = () => {
    if (!notesContent) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Allow pop-ups to export PDF.')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html><head><title>Lecture Notes</title>
      <style>
        body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; line-height: 1.6; color: #111; }
        h1 { font-size: 24px; } h2 { font-size: 18px; margin-top: 24px; } h3 { font-size: 15px; }
        p, li { font-size: 14px; }
      </style></head><body>
      <pre style="white-space: pre-wrap; font-family: inherit;">${formatNotesForCopy(notesContent).replace(/</g, '&lt;')}</pre>
      </body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    toast.success('Print dialog opened — save as PDF.')
  }

  const actions = [
    {
      id: 'ask',
      label: 'Ask AI',
      icon: Sparkles,
      onClick: () => {},
      disabled: !transcriptText,
    },
    {
      id: 'flashcards',
      label: 'Generate Flashcards',
      icon: Brain,
      onClick: () => void handleFlashcards(),
      loading: flashcardsLoading,
      disabled: !transcriptText,
    },
    {
      id: 'copy',
      label: 'Copy Notes',
      icon: ClipboardCopy,
      onClick: () => void handleCopy(),
      disabled: !notesContent,
    },
    {
      id: 'pdf',
      label: 'Export PDF',
      icon: FileDown,
      onClick: handleExportPdf,
      disabled: !notesContent,
    },
  ]

  return (
    <aside
      className={cn(
        'relative flex flex-col rounded-3xl border border-white/[0.08] bg-[#0D0D0D]/90 p-5 backdrop-blur-xl',
        'shadow-[0_16px_48px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 top-12 h-32 w-32 rounded-full bg-ambient/[0.12] blur-3xl" />

      <div className="relative mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-ambient/25 bg-ambient/[0.1]">
          <Sparkles className="h-5 w-5 text-ambient" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">AI Actions</h3>
          <p className="text-xs text-muted">Powered by your transcript</p>
        </div>
      </div>

      <div className="relative space-y-2">
        {actions
          .filter((action) => action.id !== 'ask')
          .map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3',
                  'text-sm font-medium text-foreground transition-all cursor-pointer',
                  'hover:border-accent/25 hover:bg-accent/[0.06] hover:shadow-[0_0_20px_rgba(214,162,11,0.08)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {action.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                )}
                {action.label}
              </button>
            )
          })}
      </div>

      <div className="relative mt-5 rounded-2xl border border-ambient/20 bg-ambient/[0.05] p-4">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-ambient" />
          <span className="text-xs font-semibold uppercase tracking-wider text-ambient/90">
            Ask AI
          </span>
        </div>

        <textarea
          value={askDraft}
          onChange={(event) => setAskDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleAsk()
            }
          }}
          rows={3}
          placeholder="Ask anything about this lecture…"
          className={cn(
            'w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5',
            'text-sm text-foreground placeholder:text-muted/60 outline-none caret-accent',
          )}
        />

        <button
          type="button"
          onClick={() => void handleAsk()}
          disabled={!askDraft.trim() || askLoading || !transcriptText}
          className={cn(
            'mt-3 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-background',
            'shadow-[0_0_20px_rgba(214,162,11,0.2)] transition-all cursor-pointer hover:bg-accent-soft',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {askLoading ? 'Thinking…' : 'Ask'}
        </button>

        {askAnswer && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm leading-relaxed text-foreground/90"
          >
            {askAnswer}
          </motion.p>
        )}
      </div>

      {flashcards.length > 0 && (
        <div className="relative mt-5 rounded-2xl border border-accent/15 bg-accent/[0.04] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent/80">
            Flashcards
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {flashcards.slice(0, 3).map((card, index) => (
              <div key={`${card.front}-${index}`} className="text-xs">
                <p className="font-medium text-foreground">{card.front}</p>
                <p className="text-muted">{card.back}</p>
              </div>
            ))}
          </div>
          {flashcardsSaved && (
            <Link
              to="/dashboard/flashcards"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-soft"
            >
              <ExternalLink className="h-3 w-3" />
              Review in deck
            </Link>
          )}
        </div>
      )}
    </aside>
  )
}
