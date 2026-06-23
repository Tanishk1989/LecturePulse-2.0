import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Loader2, User } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { askAboutNotes, formatNotesForCopy } from '@/services/aiGenerationService'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'

interface AskAITabProps {
  transcriptText: string | null
  notesContent: any
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function AskAITab({ transcriptText, notesContent }: AskAITabProps) {
  const { toast } = useToast()
  const [askDraft, setAskDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your LecturePulse study assistant. Ask me anything about this lecture's content, formulas, or concepts, and I'll explain them using only the lecture material.",
    },
  ])

  const chatEndRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [history, loading])

  const handleAsk = async () => {
    const question = askDraft.trim()
    if (!question || !transcriptText) return

    setLoading(true)
    setAskDraft('')

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: question,
    }
    setHistory((prev) => [...prev, userMsg])

    try {
      const context = notesContent ? formatNotesForCopy(notesContent).slice(0, 3000) : undefined
      const answer = await askAboutNotes(transcriptText, question, context)
      
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
      }
      setHistory((prev) => [...prev, assistantMsg])
    } catch (err) {
      toast.error('AI request failed. Please check connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-18rem)] min-h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-black/60 backdrop-blur-md">
      {/* Header info */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-ambient/20 bg-ambient/[0.05] text-ambient">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ask AI Study Assistant</h3>
          <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Grounded in this lecture</p>
        </div>
      </div>

      {/* Chat Messages viewport */}
      <ScrollFadeContainer
        fadeColor="var(--card)"
        className="flex-1 p-5 space-y-4"
      >
        {history.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-start gap-3 max-w-[85%]',
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border',
                  isUser
                    ? 'border-accent/30 bg-accent/15 text-accent'
                    : 'border-white/[0.08] bg-[#0E0E0E] text-muted'
                )}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : 'AI'}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  isUser
                    ? 'bg-accent/10 text-foreground rounded-tr-none border border-accent/15 whitespace-pre-wrap'
                    : 'bg-white/[0.03] text-foreground/90 rounded-tl-none border border-white/[0.06]'
                )}
              >
                {isUser ? msg.text : <MarkdownRenderer content={msg.text} />}
              </div>
            </motion.div>
          )
        })}

        {loading && (
          <div className="flex items-start gap-3 mr-auto max-w-[85%]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#0E0E0E] text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              <div className="flex gap-1.5 py-1.5 items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                    style={{
                      animation: 'pulse 1.2s infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </ScrollFadeContainer>

      {/* Input container */}
      <div className="border-t border-white/[0.06] p-4 bg-zinc-950/40">
        <div className="flex gap-2">
          <input
            value={askDraft}
            onChange={(e) => setAskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleAsk()
              }
            }}
            placeholder={
              transcriptText
                ? 'Ask anything about this lecture...'
                : 'Lecture content unavailable to query...'
            }
            disabled={loading || !transcriptText}
            className={cn(
              'h-11 flex-1 rounded-full border border-white/[0.08] bg-[#0E0E0E] px-4 text-sm text-foreground outline-none transition-all',
              'placeholder:text-muted/50 focus:border-accent/30',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          />
          <button
            type="button"
            onClick={() => void handleAsk()}
            disabled={!askDraft.trim() || loading || !transcriptText}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full bg-accent text-background transition-all cursor-pointer hover:bg-accent-soft',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
