import { motion, useReducedMotion } from 'framer-motion'
import { Mic, Radio, Cpu, Database } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { FadeUp } from '@/components/effects/FadeUp'
import { AmbientGlow } from '@/components/effects/AmbientGlow'

const steps = [
  {
    step: '01',
    title: 'Capture',
    tech: 'Web Audio API',
    description:
      'Raw browser microphone inputs captured via the Web Audio API — no native apps, no plugins. Pure web-native audio acquisition.',
    icon: Mic,
    accent: '#EF4444',
  },
  {
    step: '02',
    title: 'Transport',
    tech: 'WebSockets',
    description:
      'Asynchronous WebSocket streams pipe live binary audio chunks to the server with sub-100ms latency for real-time processing.',
    icon: Radio,
    accent: '#4F46E5',
  },
  {
    step: '03',
    title: 'Context Engine',
    tech: 'AI Orchestration',
    description:
      'Multi-model AI orchestration handles live speech capture, semantic parsing, and structured JSON extraction from raw audio.',
    icon: Cpu,
    accent: 'var(--color-accent)',
  },
  {
    step: '04',
    title: 'Persistence',
    tech: 'Supabase PostgreSQL',
    description:
      'Lecture text, definitions, and flashcards securely indexed in Supabase PostgreSQL with row-level security.',
    icon: Database,
    accent: '#10B981',
  },
]

export function EngineeringBlueprintSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <Section id="blueprint" className="relative overflow-hidden bg-card/30">
      <AmbientGlow />

      <FadeUp>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-medium tracking-widest text-muted uppercase">
            Under the Hood
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-foreground mt-3 leading-[0.92]">
            The Engineering Blueprint
          </h2>
          <p className="mt-4 text-muted text-lg">
            A four-stage data pipeline from microphone to mastery — built with
            modern web standards and production-grade infrastructure.
          </p>
        </div>
      </FadeUp>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connecting line (desktop) */}
        <div className="hidden lg:block absolute top-1/2 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-red/30 via-[#4F46E5]/30 via-accent/30 to-emerald/30" />

        {steps.map((step, i) => (
          <FadeUp key={step.title} delay={i * 0.1}>
            <motion.div
              className="floating-card rounded-2xl p-6 h-full relative"
              whileHover={prefersReducedMotion ? {} : { y: -4 }}
              style={{ borderColor: `${step.accent}20` }}
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-medium tracking-widest text-muted">{step.step}</span>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: `${step.accent}12`, border: `1px solid ${step.accent}25` }}
                >
                  <step.icon className="h-5 w-5" style={{ color: step.accent }} />
                </div>
              </div>

              <h3 className="font-heading text-xl text-foreground">{step.title}</h3>
              <span
                className="inline-block mt-2 text-[10px] font-mono px-2 py-1 rounded"
                style={{ background: `${step.accent}10`, color: step.accent }}
              >
                {step.tech}
              </span>
              <p className="mt-4 text-sm text-muted leading-relaxed">{step.description}</p>

              {i < steps.length - 1 && (
                <div className="lg:hidden flex justify-center mt-6">
                  <motion.div
                    className="w-px h-6 bg-white/10"
                    animate={prefersReducedMotion ? {} : { opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              )}
            </motion.div>
          </FadeUp>
        ))}
      </div>
    </Section>
  )
}
