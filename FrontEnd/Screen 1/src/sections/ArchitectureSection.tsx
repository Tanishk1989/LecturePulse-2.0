import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Mic,
  Brain,
  BookOpen,
  Layers,
  Network,
  Target,
  Bot,
  Sparkles,
} from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { FadeUp } from '@/components/effects/FadeUp'
import { BackgroundDepth } from '@/components/effects/BackgroundDepth'
import { ParticleField } from '@/components/effects/ParticleField'
import { AnimatedWaveform } from '@/components/shared/AnimatedWaveform'
import { cn } from '@/lib/utils'

const pipeline = [
  {
    id: 'lecture',
    label: 'Lecture Audio',
    icon: Mic,
    color: '#FAFAFA',
    hint: 'Live browser capture via Web Audio API',
  },
  {
    id: 'whisper',
    label: 'Whisper AI',
    icon: Mic,
    color: '#EF4444',
    hint: 'Real-time speech-to-text capture',
    live: true,
  },
  {
    id: 'lecture-text',
    label: 'Lecture Text',
    icon: BookOpen,
    color: '#A1A1AA',
    hint: 'Structured, timestamped lecture text',
  },
  {
    id: 'llm',
    label: 'LLM',
    icon: Brain,
    color: '#4F46E5',
    hint: 'Semantic parsing and knowledge extraction',
  },
]

const outputs = [
  { label: 'Smart Notes', icon: BookOpen, hint: 'Clean, searchable study notes' },
  { label: 'Flashcards', icon: Layers, hint: 'Auto-generated with FSRS scheduling' },
  { label: 'Knowledge Graph', icon: Network, hint: 'Visual mastery map of concepts' },
  { label: 'Exam Oracle', icon: Target, hint: 'Predicted high-yield exam topics' },
]

function FlowArrow({ horizontal }: { horizontal: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  if (horizontal) {
    return (
      <div className="hidden lg:flex items-center px-1 shrink-0">
        <motion.div
          className="w-8 h-px bg-gradient-to-r from-white/10 via-accent/50 to-white/10 relative overflow-hidden"
          animate={prefersReducedMotion ? {} : { opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="absolute inset-y-0 w-3 bg-accent/80 blur-[1px]"
            animate={prefersReducedMotion ? {} : { left: ['-20%', '120%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
        <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[5px] border-t-transparent border-b-transparent border-l-accent/60" />
      </div>
    )
  }

  return (
    <div className="flex lg:hidden flex-col items-center py-2">
      <motion.div
        className="w-px h-6 bg-gradient-to-b from-white/10 via-accent/50 to-white/10 relative overflow-hidden"
        animate={prefersReducedMotion ? {} : { opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.div
          className="absolute inset-x-0 h-2 bg-accent/70 blur-[1px]"
          animate={prefersReducedMotion ? {} : { top: ['-20%', '120%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-accent/60" />
    </div>
  )
}

function PipelineStep({
  step,
  hovered,
  onHover,
}: {
  step: (typeof pipeline)[0]
  hovered: string | null
  onHover: (id: string | null) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const isHovered = hovered === step.id

  return (
    <motion.div
      className={cn(
        'floating-card glow-hover rounded-xl px-4 py-3 flex flex-col items-center text-center min-w-[120px] lg:min-w-[130px] shrink-0 cursor-pointer',
        step.id === 'whisper' && 'border-red/20',
        step.id === 'llm' && 'border-[#4F46E5]/25',
        isHovered && 'border-accent/30 shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.12)]',
      )}
      onMouseEnter={() => onHover(step.id)}
      onMouseLeave={() => onHover(null)}
      animate={
        prefersReducedMotion
          ? {}
          : {
              boxShadow: isHovered
                ? '0 0 40px rgba(79,70,229,0.2)'
                : ['0 0 0px rgba(79,70,229,0)', '0 0 24px rgba(79,70,229,0.12)', '0 0 0px rgba(79,70,229,0)'],
            }
      }
      transition={{ duration: 3, repeat: isHovered ? 0 : Infinity }}
      whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.03 }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg mb-2"
        style={{ background: `${step.color}12`, border: `1px solid ${step.color}30` }}
      >
        <step.icon className="h-5 w-5" style={{ color: step.color }} />
      </div>
      <span className="text-xs font-semibold text-foreground">{step.label}</span>
      {step.live && (
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <AnimatedWaveform height={14} bars={6} />
          <span className="text-[8px] uppercase tracking-wider text-red/80">Live</span>
        </div>
      )}
      {isHovered && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 text-[10px] text-muted leading-snug max-w-[110px]"
        >
          {step.hint}
        </motion.p>
      )}
    </motion.div>
  )
}

export function ArchitectureSection() {
  const [hovered, setHovered] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  return (
    <Section id="architecture" className="relative overflow-hidden">
      <BackgroundDepth variant="architecture" />
      <ParticleField count={30} yellowRatio={0.4} className="opacity-60" />

      <FadeUp>
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground leading-[0.92]">
            Built with a modern
            <br />
            <span className="text-gradient-pulse">AI architecture</span>
          </h2>
          <p className="mt-5 text-muted text-lg">
            From raw lecture audio to personalized tutoring — every layer designed
            for real-time learning intelligence.
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.2}>
        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-0 lg:gap-0 flex-wrap lg:flex-nowrap">
            {pipeline.map((step, i) => (
              <div key={step.id} className="flex flex-col lg:flex-row items-center">
                <PipelineStep step={step} hovered={hovered} onHover={setHovered} />
                {i < pipeline.length - 1 && <FlowArrow horizontal />}
              </div>
            ))}
          </div>

          <FlowArrow horizontal={false} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto mt-2">
            {outputs.map((out, i) => (
              <motion.div
                key={out.label}
                className="floating-card glow-hover rounded-xl p-4 text-center cursor-pointer border-accent/10"
                animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.35 }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -6 }}
                onMouseEnter={() => setHovered(out.label)}
                onMouseLeave={() => setHovered(null)}
              >
                <out.icon className="h-4 w-4 text-accent mx-auto mb-2" />
                <span className="text-xs font-medium text-foreground">{out.label}</span>
                {hovered === out.label && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-[10px] text-muted"
                  >
                    {out.hint}
                  </motion.p>
                )}
              </motion.div>
            ))}
          </div>

          <FlowArrow horizontal={false} />

          <motion.div
            className="floating-card glow-hover rounded-xl px-6 py-4 max-w-sm mx-auto flex items-center gap-4 border-red/20 shadow-[0_0_40px_rgba(239,68,68,0.1)] cursor-pointer"
            animate={
              prefersReducedMotion
                ? {}
                : {
                    boxShadow: [
                      '0 0 24px rgba(239,68,68,0.06)',
                      '0 0 48px rgba(239,68,68,0.14)',
                      '0 0 24px rgba(239,68,68,0.06)',
                    ],
                  }
            }
            transition={{ duration: 4, repeat: Infinity }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -4 }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red/10 border border-red/20">
              <Bot className="h-5 w-5 text-red" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground">AI Tutor</span>
              <p className="text-[10px] text-muted mt-0.5">Context-aware explanations from your lectures</p>
            </div>
            <Sparkles className="h-4 w-4 text-red/70" />
          </motion.div>

          <div className="absolute -right-8 top-1/4 hidden xl:block opacity-20 pointer-events-none">
            <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
              <circle cx="40" cy="40" r="30" stroke="var(--color-accent)" strokeWidth="0.5" fill="none" opacity="0.5" />
              <circle cx="40" cy="40" r="20" stroke="#4F46E5" strokeWidth="0.5" fill="none" />
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <line
                  key={deg}
                  x1="40"
                  y1="40"
                  x2={40 + 28 * Math.cos((deg * Math.PI) / 180)}
                  y2={40 + 28 * Math.sin((deg * Math.PI) / 180)}
                  stroke="var(--color-accent)"
                  strokeWidth="0.5"
                  opacity="0.4"
                />
              ))}
            </svg>
          </div>
        </div>
      </FadeUp>
    </Section>
  )
}
