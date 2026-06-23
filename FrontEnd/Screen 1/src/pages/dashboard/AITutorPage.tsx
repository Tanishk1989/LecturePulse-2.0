import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowUp,
  Brain,
  ClipboardCheck,
  Clock,
  HelpCircle,
  Lightbulb,
  List,
  Loader2,
  Mic,
  MessageSquare,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { useLectures } from '@/hooks/useLectures'
import { useAuthContext } from '@/context/AuthContext'
import { useAiTutor } from '@/hooks/useAiTutor'
import { useVoiceTutor } from '@/hooks/useVoiceTutor'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { getUserNotes } from '@/services/notesService'
import type { LectureNotes } from '@/types/notes'

const suggestionConfig = [
  { text: 'Explain this concept', icon: Lightbulb },
  { text: 'Give me examples', icon: List },
]

export function AITutorPage() {
  const { user } = useAuthContext()
  const { lectures } = useLectures()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  const {
    messages,
    loading,
    selectedLectureId,
    setSelectedLectureId,
    ask,
    retryTutorQuestion,
  } = useAiTutor()

  const [input, setInput] = useState('')

  const handleExplainConceptClick = () => {
    setInput('Explain [concept] from my lectures')
    window.requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const val = 'Explain [concept] from my lectures'
        const start = val.indexOf('[concept]')
        if (start !== -1) {
          inputRef.current.setSelectionRange(start, start + '[concept]'.length)
        }
      }
    })
  }
  const [voiceActive, setVoiceActive] = useState(false)
  const [recentTopics, setRecentTopics] = useState<string[]>([])
  const [userNotes, setUserNotes] = useState<LectureNotes[]>([])
  const [starterQuestions, setStarterQuestions] = useState<string[]>([])
  const [showResumeBanner, setShowResumeBanner] = useState(false)

  // Fetch all notes to extract questions for empty state starters
  useEffect(() => {
    if (user) {
      getUserNotes(user.uid)
        .then(setUserNotes)
        .catch((e) => console.error('Failed to load user notes:', e))
    }
  }, [user])

  // Get name of the topic helper
  const getTopicName = useCallback(
    (topicId: string) => {
      if (topicId === 'all') return 'All subjects'
      const lecture = lectures.find((l) => l.id === topicId)
      return lecture ? lecture.title : 'Selected Lecture'
    },
    [lectures],
  )

  // Manage list of recent topics
  useEffect(() => {
    if (!user) return
    const key = `lecturepulse:tutor:recent_topics:${user.uid}`
    const saved = localStorage.getItem(key)
    let list: string[] = []
    if (saved) {
      try {
        list = JSON.parse(saved)
      } catch (e) {}
    }

    // Filter out deleted lectures
    const validIds = new Set(lectures.map((l) => l.id))
    list = list.filter((id) => id === 'all' || validIds.has(id))

    // Default topics if empty
    if (list.length === 0) {
      list = ['all', ...lectures.slice(0, 4).map((l) => l.id)]
    } else {
      if (!list.includes('all')) {
        list.push('all')
      }
    }

    setRecentTopics(Array.from(new Set(list)).slice(0, 5))
  }, [user, lectures])

  const addRecentTopic = useCallback(
    (topicId: string) => {
      if (!user) return
      const key = `lecturepulse:tutor:recent_topics:${user.uid}`
      const saved = localStorage.getItem(key)
      let list: string[] = []
      if (saved) {
        try {
          list = JSON.parse(saved)
        } catch (e) {}
      }
      list = [topicId, ...list.filter((id) => id !== topicId)].slice(0, 5)
      localStorage.setItem(key, JSON.stringify(list))
      setRecentTopics(list)
    },
    [user],
  )

  // Handle starter questions generation
  useEffect(() => {
    if (selectedLectureId) {
      const currentNotes = userNotes.find((n) => n.lectureId === selectedLectureId)
      const lectureQuestions = currentNotes?.content?.questions?.map((q) => q.question) ?? []
      if (lectureQuestions.length > 0) {
        setStarterQuestions(lectureQuestions.slice(0, 3))
      } else {
        const topicName = getTopicName(selectedLectureId)
        setStarterQuestions([
          `Explain the main concepts of ${topicName}`,
          `Give me a summary of ${topicName}`,
          `What are the key takeaways from ${topicName}?`,
        ])
      }
    } else {
      setStarterQuestions([
        'Summarize the key points of my recent lectures',
        'Help me identify my weak areas across all subjects',
        'Give me a practice quiz on my lecture materials',
      ])
    }
  }, [selectedLectureId, userNotes, getTopicName])

  // Resume Session Banner check
  useEffect(() => {
    if (!user) return
    const topicId = selectedLectureId || 'all'
    const dismissed =
      sessionStorage.getItem(`lecturepulse:dismissed_banner:${user.uid}:${topicId}`) === 'true'

    if (!dismissed && messages.length > 0) {
      const userMsgs = messages.filter((m) => m.role === 'user')
      if (userMsgs.length > 0) {
        const lastMsg = userMsgs[userMsgs.length - 1].content.trim()
        const isQuestion = lastMsg.endsWith('?')
        const uncertaintyPhrases = [
          "i don't get",
          "don't understand",
          "confused",
          "still unsure",
          "not sure",
          "how to",
          "stuck",
          "help me understand",
        ]
        const hasUncertainty = uncertaintyPhrases.some((phrase) =>
          lastMsg.toLowerCase().includes(phrase),
        )

        if (isQuestion || hasUncertainty) {
          setShowResumeBanner(true)
          return
        }
      }
    }
    setShowResumeBanner(false)
  }, [messages, selectedLectureId, user])

  const dismissBanner = () => {
    const topicId = selectedLectureId || 'all'
    if (user) {
      sessionStorage.setItem(`lecturepulse:dismissed_banner:${user.uid}:${topicId}`, 'true')
    }
    setShowResumeBanner(false)
  }

  // Voice Tutor implementation
  const handleMicUnavailable = useCallback(
    (msg: string) => {
      setVoiceActive(false)
      toast.error(msg)
    },
    [toast],
  )

  const voice = useVoiceTutor({
    enabled: voiceActive,
    loading,
    messages,
    ask: async (text) => {
      addRecentTopic(selectedLectureId || 'all')
      await ask(text)
    },
    onMicUnavailable: handleMicUnavailable,
    defaultTtsEnabled: false, // Default to OFF!
  })

  // Turn off voice activation when VoiceSession ends speaking or responding
  useEffect(() => {
    if (voice.phase === 'ready') {
      setVoiceActive(false)
    }
  }, [voice.phase])

  // Reset voice on error
  useEffect(() => {
    if (voice.phase === 'error' && voice.micError) {
      toast.error(voice.micError)
      setVoiceActive(false)
    }
  }, [voice.phase, voice.micError, toast])

  const handleOrbClick = () => {
    if (!voiceActive) {
      setVoiceActive(true)
    } else {
      voice.handlePrimaryAction()
    }
  }

  const handleSubmit = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || loading) return
    setInput('')
    addRecentTopic(selectedLectureId || 'all')
    void ask(trimmed)
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const showGreeting = messages.length === 0 && !loading
  const showPromptChips = messages.filter((m) => m.role !== 'context-notice').length === 0

  return (
    <div className="relative -mx-5 -my-7 lg:-mx-8 lg:-my-9 h-[calc(100dvh-72px)] flex flex-col overflow-hidden bg-background text-foreground z-10">
      {/* Soft background glow details */}
      <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-accent/[0.04] blur-[110px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-ambient/[0.03] blur-[110px] pointer-events-none" />

      {/* Header bar */}
      <div className="px-5 py-4 lg:px-8 border-b border-border shrink-0 bg-background/50 backdrop-blur-md z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            AI Tutor
          </span>
          <h1 className="text-sm text-muted font-medium">
            A real tutor that remembers what you struggle with
          </h1>
        </div>

        {/* Topic selector pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none shrink-0">
          {recentTopics.map((topicId) => {
            const isActive =
              (topicId === 'all' && !selectedLectureId) || selectedLectureId === topicId
            const name = getTopicName(topicId)
            return (
              <button
                key={topicId}
                type="button"
                onClick={() => {
                  setSelectedLectureId(topicId === 'all' ? null : topicId)
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-200 cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-accent/15 border-accent/40 text-accent shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.1)]'
                    : 'bg-card border-border text-muted hover:text-foreground hover:bg-card/85',
                )}
              >
                {name}
              </button>
            )
          })}
        </div>

        {/* Resume Banner */}
        <AnimatePresence>
          {showResumeBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="resume-session-banner mt-3.5 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-300 text-xs shadow-sm cursor-pointer"
              onClick={dismissBanner}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Last session: you were still unsure about{' '}
                  <strong>{getTopicName(selectedLectureId || 'all')}</strong>. Want to continue?
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  dismissBanner()
                }}
                className="p-1 rounded-md hover:bg-amber-500/10 text-amber-600 dark:text-amber-300 transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat Area Container */}
      <div className="flex-1 flex flex-col min-h-0 relative max-w-4xl mx-auto w-full px-5 py-4">
        {/* Messages list */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto min-h-0 pb-8 space-y-5 scrollbar-none flex flex-col"
        >
          {showGreeting && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
              {/* Upgraded Icon with ambient glow */}
              <div className="relative mb-6 flex items-center justify-center">
                {/* Ambient radial glow */}
                <div className="absolute h-[200px] w-[200px] rounded-full bg-accent/6 blur-[42px] pointer-events-none z-0" />
                
                <div
                  className="relative h-14 w-14 rounded-full flex items-center justify-center border-[1.5px] border-accent/40 shadow-sm z-10"
                  style={{
                    background: 'linear-gradient(135deg, var(--bg-gradient-icon-start), var(--bg-gradient-icon-end))',
                  }}
                >
                  <Sparkles className="h-6 w-6 text-accent animate-pulse" />
                </div>
              </div>

              {/* Personalized Greeting */}
              <h2 className="text-base font-bold text-foreground mb-1">
                Hi {firstName}, what are we learning today?
              </h2>
              <p className="text-xs text-muted max-w-sm leading-relaxed mb-8">
                I remember everything you've studied.
              </p>

              {/* 2x2 Action Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mx-auto z-10">
                {/* Card 1: Explain a concept */}
                <button
                  type="button"
                  onClick={handleExplainConceptClick}
                  className="tutor-action-card group"
                >
                  <div className="mb-2.5 rounded-lg p-1.5 bg-[#8FB816]/10 border border-[#8FB816]/20 text-[#8FB816] dark:text-accent group-hover:scale-105 transition-all duration-200">
                    <Brain className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Explain a concept</span>
                  <span className="text-[10px] text-muted-secondary mt-0.5">from my lectures</span>
                </button>

                {/* Card 2: Find weak areas */}
                <button
                  type="button"
                  onClick={() => handleSubmit("Help me identify my weak areas across all subjects")}
                  className="tutor-action-card group"
                >
                  <div className="mb-2.5 rounded-lg p-1.5 bg-red/10 border border-red/20 text-red group-hover:scale-105 transition-all duration-200">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Find weak areas</span>
                  <span className="text-[10px] text-muted-secondary mt-0.5">across all subjects</span>
                </button>

                {/* Card 3: Quiz me */}
                <button
                  type="button"
                  onClick={() => handleSubmit("Give me a practice quiz on my recent lecture materials")}
                  className="tutor-action-card group"
                >
                  <div className="mb-2.5 rounded-lg p-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 group-hover:scale-105 transition-all duration-200">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Quiz me</span>
                  <span className="text-[10px] text-muted-secondary mt-0.5">on recent material</span>
                </button>

                {/* Card 4: Open discussion */}
                <button
                  type="button"
                  onClick={() => handleSubmit("Let's have a free-form discussion about what I've been studying")}
                  className="tutor-action-card group"
                >
                  <div className="mb-2.5 rounded-lg p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-400 group-hover:scale-105 transition-all duration-200">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Open discussion</span>
                  <span className="text-[10px] text-muted-secondary mt-0.5">free-form session</span>
                </button>
              </div>
            </div>
          )}

          {/* Render conversation history */}
          {!showGreeting &&
            messages.map((message, index) => {
              if (message.role === 'context-notice') {
                return (
                  <div
                    key={`context-${index}`}
                    className="flex items-center gap-2 py-1 text-[10px] font-medium uppercase tracking-wider text-accent/70 shrink-0"
                  >
                    <span className="h-px flex-1 bg-accent/15" />
                    <span>{message.content}</span>
                    <span className="h-px flex-1 bg-accent/15" />
                  </div>
                )
              }

              const isUser = message.role === 'user'

              return (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    'flex flex-col w-full max-w-[80%] shrink-0',
                    isUser ? 'self-start text-left' : 'self-end text-right',
                  )}
                >
                  <span
                    className={cn(
                      'text-[9px] tracking-widest font-extrabold uppercase mb-1.5 px-1',
                      isUser ? 'text-muted-secondary text-left' : 'text-accent text-right',
                    )}
                  >
                    {isUser ? 'You' : 'Tutor'}
                  </span>

                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm leading-relaxed border shadow-sm text-left',
                      isUser
                        ? 'bg-card border-border text-foreground'
                        : 'bg-accent/10 border-accent/20 text-foreground',
                    )}
                  >
                    {isUser ? (
                      message.content
                    ) : message.content ? (
                      <>
                        <MarkdownRenderer
                          content={message.content}
                          showCursor={message.isStreaming}
                        />
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
                </div>
              )
            })}
        </div>

        {/* Floating Voice Orb */}
        <div className="absolute right-6 bottom-20 flex flex-col items-center gap-3 z-30">
          {/* TTS Speaker toggle */}
          <button
            type="button"
            onClick={voice.toggleTts}
            aria-label={voice.ttsEnabled ? 'Mute speech' : 'Unmute speech'}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border shadow-md transition-all duration-200 cursor-pointer hover:scale-105',
              voice.ttsEnabled
                ? 'bg-accent/25 border-accent/40 text-accent'
                : 'bg-card border-border text-muted hover:text-foreground',
            )}
          >
            {voice.ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Voice Mic Orb Button */}
          <div className="relative flex items-center justify-center">
            {voiceActive && voice.phase === 'listening' && (
              <>
                <motion.span
                  className="absolute h-14 w-14 rounded-full border border-accent/40"
                  animate={{ scale: [1, 1.4], opacity: [0.65, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.span
                  className="absolute h-14 w-14 rounded-full border border-accent/25"
                  animate={{ scale: [1, 1.6], opacity: [0.45, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
                />
              </>
            )}

            <button
              type="button"
              onClick={handleOrbClick}
              disabled={
                voice.phase === 'initializing' ||
                voice.phase === 'transcribing' ||
                voice.phase === 'thinking'
              }
              className={cn(
                'relative flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer shadow-lg',
                voiceActive
                  ? 'bg-accent border-accent/40 text-zinc-950 scale-110'
                  : 'bg-accent border-accent/30 text-zinc-950 hover:scale-105 hover:shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.3)]',
              )}
            >
              <Mic className="h-5 w-5" strokeWidth={2.25} />
            </button>

            {voiceActive && voice.phase === 'listening' && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-accent text-zinc-950 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap uppercase tracking-wider">
                Listening...
              </div>
            )}
            {voiceActive && voice.phase === 'transcribing' && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-card border border-border text-foreground text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 uppercase tracking-wider">
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
                Transcribing...
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="pt-3 border-t border-border shrink-0 bg-background pb-3">
          {/* Suggested chips above the bar */}
          {showPromptChips && (
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestionConfig.map(({ text, icon: Icon }) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => handleSubmit(text)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border border-border bg-card/65 px-3.5 py-1.5 text-xs text-muted hover:text-foreground hover:border-accent/30 transition-all duration-200 cursor-pointer',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  <span>{text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit(input)
            }}
            className="relative flex items-center w-full"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 h-12 rounded-xl border border-border bg-card px-4 pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/30 transition-all duration-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-background hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-background" />
              ) : (
                <ArrowUp className="h-4 w-4 text-background" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
