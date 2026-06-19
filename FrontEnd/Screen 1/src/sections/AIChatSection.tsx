import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, Sparkles } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { FadeUp } from '@/components/effects/FadeUp'
import { AmbientGlow } from '@/components/effects/AmbientGlow'

const messages = [
  { role: 'assistant', text: "I noticed you're struggling with Eigenvalues. Want me to pull up the notes from Monday's lecture?" },
  { role: 'user', text: 'Yes, and can you explain the characteristic polynomial?' },
  { role: 'assistant', text: 'The characteristic polynomial is det(A − λI). For your 2×2 matrix, that expands to λ² − tr(A)λ + det(A) = 0. I found this in Lecture 7 at 23:14.' },
]

const actionButtons = ['Explain', 'Practice', 'Review']

export function AIChatSection() {
  const [visibleMessages, setVisibleMessages] = useState(1)
  const [dotCount, setDotCount] = useState(0)

  useEffect(() => {
    const dotInterval = setInterval(() => setDotCount((c) => (c + 1) % 4), 500)
    const msgInterval = setInterval(() => {
      setVisibleMessages((v) => (v < messages.length ? v + 1 : v))
    }, 2500)
    return () => {
      clearInterval(dotInterval)
      clearInterval(msgInterval)
    }
  }, [])

  return (
    <Section className="relative overflow-hidden">
      <AmbientGlow />

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <FadeUp>
          <div>
            <h2 className="font-heading text-4xl md:text-5xl text-foreground leading-[0.92]">
              Your personal AI tutor
            </h2>
            <p className="mt-4 text-muted text-lg leading-relaxed">
              A ChatGPT-style interface grounded in your lectures. Ask anything,
              get answers sourced from your actual class material.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {actionButtons.map((btn) => (
                <Button
                  key={btn}
                  variant={btn === 'Explain' ? 'red' : 'secondary'}
                  size="sm"
                >
                  {btn}
                </Button>
              ))}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <motion.div
            className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="absolute -inset-4 bg-[#4F46E5]/[0.08] blur-2xl rounded-3xl" />

            <div className="relative floating-card rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] bg-card/80">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red/10 border border-red/20">
                  <Bot className="h-4 w-4 text-red" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">AI Tutor</p>
                  <p className="text-xs text-muted">Context: Linear Algebra · Lecture 7</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-red animate-pulse" />
                  <span className="text-xs text-red/80">Active</span>
                </div>
              </div>

              <div className="p-5 space-y-4 min-h-[260px] max-h-[320px] overflow-y-auto bg-background/50">
                <AnimatePresence>
                  {messages.slice(0, visibleMessages).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red/10">
                          <Bot className="h-3.5 w-3.5 text-red" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-white/[0.06] text-foreground rounded-tr-sm'
                            : 'bg-card border border-white/[0.06] text-foreground rounded-tl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {visibleMessages < messages.length && (
                  <div className="flex items-center gap-2 pl-10">
                    <span className="text-xs text-red font-medium tracking-wider">
                      Thinking{'.'.repeat(dotCount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 pb-5 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-card/60 p-2">
                  <input
                    type="text"
                    placeholder="Ask about the lecture..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted outline-none"
                    readOnly
                  />
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-background shadow-[0_0_15px_rgba(214,162,11,0.25)]">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </FadeUp>
      </div>
    </Section>
  )
}
