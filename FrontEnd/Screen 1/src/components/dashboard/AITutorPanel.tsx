import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUp,
  FileText,
  Key,
  Lightbulb,
  List,
  Loader2,
  Mic,
  Sparkles,
  X,
} from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { useLectures } from '@/context/LectureContext'
import { useToast } from '@/components/ui/ToastProvider'
import { useAiTutor } from '@/hooks/useAiTutor'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'
import { VoiceTutorControls } from '@/components/dashboard/VoiceTutorControls'

const suggestionConfig = [
  { text: 'Explain this concept', icon: Lightbulb },
  { text: 'Give me examples', icon: List },
  { text: 'Summarize this', icon: FileText },
  { text: 'What are the key points?', icon: Key },
]

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 ml-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent/60"
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
  /** When true, registers this panel as the desktop focus target for openTutor(). */
  registerFocus?: boolean
  /** Shows a collapse (X) control in the header for the desktop overlay panel. */
  showCollapseButton?: boolean
}

export function AITutorPanel({
  className,
  compact: _compact = false,
  registerFocus = false,
  showCollapseButton = false,
}: AITutorPanelProps) {
  const { tutorQuery, setTutorQuery, registerTutorPanelFocus, collapseTutorPanel } = useDashboard()
  const { lectures } = useLectures()
  const {
    messages,
    loading,
    hasContext,
    selectedLectureId,
    contextHighlighted,
    setSelectedLectureId,
    ask,
    retryTutorQuestion,
  } = useAiTutor()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])
  const [input, setInput] = useState(tutorQuery)
  const [voiceMode, setVoiceMode] = useState(false)
  const lastHandledQueryRef = useRef('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleMicUnavailable = useCallback(
    (message: string) => {
      setVoiceMode(false)
      toast.error(message)
    },
    [toast],
  )

  const voice = useVoiceTutor({
    enabled: voiceMode,
    loading,
    messages,
    ask,
    onMicUnavailable: handleMicUnavailable,
  })

  const exitVoiceMode = useCallback(() => {
    voice.stopVoiceSession()
    setVoiceMode(false)
  }, [voice.stopVoiceSession])

  useEffect(() => {
    if (!registerFocus) return

    registerTutorPanelFocus((query?: string) => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      if (query) {
        setInput(query)
      }
      window.requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true })
      })
    })

    return () => registerTutorPanelFocus(null)
  }, [registerFocus, registerTutorPanelFocus])

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
      ref={panelRef}
      id="ai-tutor-panel"
      className={cn(
        'relative rounded-2xl border border-white/[0.15] overflow-hidden',
        'bg-card/90 backdrop-blur-2xl shadow-[0_0_48px_rgba(180,230,29,0.06)]',
        'flex flex-col',
        className,
      )}
    >
      {/* Background depth & soft gold/amber gradient */}
      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-accent/[0.08] blur-[60px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.06] via-transparent to-transparent pointer-events-none" />

      {/* Header row with Sparkles, title, and Live badge */}
      <div className="relative flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5 shrink-0">
        <Sparkles className="h-4 w-4 text-accent shrink-0" strokeWidth={1.75} />
        <h3 className="text-xs font-semibold text-foreground truncate">Ask AI about your content</h3>
        <span className="ml-auto inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-accent shrink-0">
          Live
        </span>
        {showCollapseButton && (
          <button
            type="button"
            onClick={collapseTutorPanel}
            aria-label="Collapse Ask AI panel"
            className={cn(
              'ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              'text-muted hover:text-foreground hover:bg-white/[0.06]',
              'transition-colors duration-200 cursor-pointer',
            )}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Content Context Selection Bar */}
      <div className="relative px-5 py-2.5 border-b border-white/[0.04] bg-white/[0.01] shrink-0 flex items-center justify-between gap-2 z-10">
        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Tutor Context:</span>
        <div className="relative">
          <select
            value={selectedLectureId || 'all'}
            onChange={(e) => {
              const val = e.target.value
              setSelectedLectureId(val === 'all' ? null : val)
            }}
            disabled={lectures.length === 0}
            className={cn(
              'appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] py-1 pl-2.5 pr-8 text-xs font-medium text-foreground outline-none',
              'backdrop-blur-xl transition-all duration-200 cursor-pointer hover:border-white/[0.14] focus:border-accent/35',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              contextHighlighted &&
                'border-accent/50 shadow-[0_0_12px_rgba(180,230,29,0.25)] ring-1 ring-accent/30',
            )}
          >
            {lectures.length === 0 ? (
              <option className="bg-card">No lectures available</option>
            ) : (
              <>
                <option value="all" className="bg-card">All Lectures</option>
                {lectures.map((l) => (
                  <option key={l.id} value={l.id} className="bg-card">
                    {l.title}
                  </option>
                ))}
              </>
            )}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border-l-[3.5px] border-r-[3.5px] border-t-[4px] border-l-transparent border-r-transparent border-t-muted" />
        </div>
      </div>

      {/* Messages area */}
      <div className="relative p-4 flex-1 flex flex-col min-h-0 space-y-3">
        {showGreeting && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 shrink-0">
            <p className="text-sm text-foreground/90 leading-relaxed text-left">
              {hasContext === false
                ? 'Upload and transcribe a lecture to start asking questions.'
                : "Hi! I'm your AI tutor. Ask me anything about your lectures."}
              {hasContext !== false && <TypingDots />}
            </p>
          </div>
        )}

        {(messages.length > 0 || loading) && (
          <ScrollFadeContainer
            ref={scrollRef}
            fadeColor="var(--card)"
            className={cn(
              'space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left',
              'flex-1 min-h-[140px]',
            )}
          >
            {messages.map((message, index) => {
              if (message.role === 'context-notice') {
                return (
                  <div
                    key={`context-${index}`}
                    className="flex items-center gap-2 py-1 text-[10px] font-medium uppercase tracking-wider text-accent/70"
                  >
                    <span className="h-px flex-1 bg-accent/15" />
                    <span>{message.content}</span>
                    <span className="h-px flex-1 bg-accent/15" />
                  </div>
                )
              }

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    'rounded-xl px-3 py-2.5 text-sm leading-relaxed text-left',
                    message.role === 'user'
                      ? 'ml-6 border border-accent/15 bg-accent/[0.06] text-foreground'
                      : 'mr-6 border border-white/[0.06] bg-white/[0.03] text-foreground/90',
                  )}
                >
                  {message.role === 'user' ? (
                    message.content
                  ) : message.content ? (
                    <>
                      <MarkdownRenderer content={message.content} showCursor={message.isStreaming} />
                      {message.hasError && (
                        <div className="mt-2 text-xs border-t border-white/[0.06] pt-1.5">
                          <button
                            type="button"
                            onClick={() => void retryTutorQuestion(index)}
                            className="text-accent hover:text-accent-soft underline cursor-pointer font-medium"
                          >
                            Retry last question
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                      <span>Thinking…</span>
                    </div>
                  )}
                </div>
              )
            })}
          </ScrollFadeContainer>
        )}

        {/* Bottom controls wrapper (Suggestions + Input / Voice at the very bottom) */}
        <div className="mt-auto pt-3 border-t border-border space-y-3 shrink-0">
          {voiceMode ? (
            <VoiceTutorControls
              phase={voice.phase}
              ttsEnabled={voice.ttsEnabled}
              tutorResponseText={voice.tutorResponseText}
              micError={voice.micError}
              onPrimaryAction={voice.handlePrimaryAction}
              onSwitchToText={exitVoiceMode}
              onToggleTts={voice.toggleTts}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {suggestionConfig.map(({ text, icon: Icon }) => (
                  <button
                    key={text}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSubmit(text)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border border-border bg-[var(--bg-soft)] p-2.5',
                      'text-left text-xs text-muted hover:text-foreground hover:border-accent/20',
                      'hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
                      'transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </div>
                    <span className="flex-1 truncate leading-tight">{text}</span>
                  </button>
                ))}
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit(input)
                }}
              >
                <button
                  type="button"
                  onClick={() => setVoiceMode(true)}
                  disabled={loading}
                  aria-label="Start voice session"
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    'border border-border bg-[var(--bg-soft)] text-accent',
                    'hover:border-accent/30 hover:bg-accent/5 transition-all duration-300 cursor-pointer',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  <Mic className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl border border-border bg-[var(--bg-soft)] px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/30 transition-all duration-300 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-background',
                    'shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft hover:-translate-y-0.5',
                    'transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                  aria-label="Send"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
