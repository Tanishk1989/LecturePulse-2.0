import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Brain,
  HelpCircle,
  Layers,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { useAiTutor } from '@/hooks/useAiTutor'
import { cn } from '@/lib/utils'

const suggestionConfig = [
  { text: 'Explain this concept', icon: HelpCircle, color: 'bg-ambient/10 border-ambient/20 text-ambient' },
  { text: 'Summarize my lectures', icon: BookOpen, color: 'bg-emerald/10 border-emerald/20 text-emerald' },
  { text: 'Generate flashcards', icon: Layers, color: 'bg-accent/10 border-accent/20 text-accent' },
  { text: 'Show weak areas', icon: Brain, color: 'bg-red/10 border-red/20 text-red' },
  { text: 'Help me revise', icon: Sparkles, color: 'bg-ambient/10 border-ambient/20 text-ambient' },
]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ambient/60"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  )
}

interface AITutorPanelProps {
  className?: string
  compact?: boolean
}

export function AITutorPanel({ className, compact = false }: AITutorPanelProps) {
  const { tutorQuery, setTutorQuery } = useDashboard()
  const { messages, loading, hasContext, ask } = useAiTutor()
  const [input, setInput] = useState(tutorQuery)
  const lastHandledQueryRef = useRef('')

  useEffect(() => {
    setInput(tutorQuery)
  }, [tutorQuery])

  useEffect(() => {
    const query = tutorQuery.trim()
    if (!query || query === lastHandledQueryRef.current) return

    lastHandledQueryRef.current = query
    setTutorQuery('')
    setInput('')
    void ask(query)
  }, [ask, setTutorQuery, tutorQuery])

  const handleSubmit = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || loading) return
    setInput('')
    void ask(trimmed)
  }

  const showGreeting = messages.length === 0 && !loading

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/[0.08] overflow-hidden',
        'bg-card/90 backdrop-blur-2xl shadow-[0_0_48px_rgba(79,70,229,0.1)]',
        className,
      )}
    >
      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-ambient/[0.15] blur-[60px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-ambient/[0.05] via-transparent to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
        <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted">AI Tutor</h3>
      </div>

      <div className="relative p-4 space-y-3">
        {showGreeting && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {hasContext === false
                ? 'Upload and transcribe a lecture to start asking questions.'
                : "Hi! I'm your AI tutor. Ask me anything about your lectures."}
              {hasContext !== false && <TypingDots />}
            </p>
          </div>
        )}

        {(messages.length > 0 || loading) && (
          <div
            className={cn(
              'space-y-3 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3',
              compact ? 'max-h-[240px]' : 'max-h-[360px]',
            )}
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'ml-6 border border-accent/15 bg-accent/[0.06] text-foreground'
                    : 'mr-6 border border-white/[0.06] bg-white/[0.03] text-foreground/90',
                )}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="mr-6 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Thinking…
              </div>
            )}
          </div>
        )}

        <div className={cn('space-y-2', compact ? 'max-h-[200px] overflow-y-auto' : '')}>
          {suggestionConfig.map(({ text, icon: Icon, color }) => (
            <button
              key={text}
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(text)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5',
                'text-left text-sm text-muted hover:text-foreground hover:border-accent/20',
                'hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]',
                'transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', color)}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </div>
              <span className="flex-1 truncate">{text}</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>

        <form
          className="flex gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            disabled={loading}
            className="flex-1 h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-ambient/30 transition-all duration-300 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-background',
              'shadow-[0_0_16px_rgba(214,162,11,0.2)] hover:bg-accent-soft hover:-translate-y-0.5',
              'transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
            )}
            aria-label="Send"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
