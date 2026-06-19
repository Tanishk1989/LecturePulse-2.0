import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { FadeUp } from '@/components/effects/FadeUp'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'How does LecturePulse capture lectures?',
    a: 'Via the Web Audio API in the browser — no native apps required. Audio streams over WebSockets to our backend for real-time transcription and processing.',
  },
  {
    q: 'Is the project open source?',
    a: 'Yes. LecturePulse is built in the open. You can inspect the architecture, contribute, or self-host the stack using our documented pipeline.',
  },
  {
    q: 'What tech stack powers the AI pipeline?',
    a: 'Web Audio API for capture, WebSockets for transport, LLM orchestration for context extraction, and Supabase PostgreSQL for persistence.',
  },
  {
    q: 'How is this different from just recording lectures?',
    a: 'Recording gives you audio. LecturePulse gives you structured notes, auto-generated flashcards, a knowledge mastery map, spaced repetition, and exam focus predictions.',
  },
]

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section id="faq">
      <FadeUp>
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-heading text-4xl md:text-5xl text-foreground leading-[0.92]">
            Frequently asked questions
          </h2>
        </div>
      </FadeUp>

      <div className="max-w-2xl mx-auto space-y-3">
        {faqs.map((faq, i) => (
          <FadeUp key={faq.q} delay={i * 0.05}>
            <div
              className={cn(
                'glass-card rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out',
                open === i && 'border-accent/15 shadow-[0_0_24px_rgba(214,162,11,0.06)]',
              )}
            >
              <button
                className="flex w-full items-center justify-between p-5 text-left cursor-pointer hover:bg-white/[0.02] transition-colors duration-300"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted shrink-0 transition-transform duration-300 ease-out',
                    open === i && 'rotate-180',
                  )}
                />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5">
                      <p className="text-sm text-muted leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  )
}
