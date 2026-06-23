import { motion, useReducedMotion } from 'framer-motion'
import { GitBranch, ExternalLink, Mic, Layers, Network } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { Button } from '@/components/ui/button'
import { FadeUp } from '@/components/effects/FadeUp'
import { MagneticButton } from '@/components/effects/MagneticButton'
import { BackgroundDepth } from '@/components/effects/BackgroundDepth'
import { ParticleField } from '@/components/effects/ParticleField'

const connections = [
  { d: 'M200,240 Q160,200 120,160', target: 'flashcard', label: 'Flashcards' },
  { d: 'M200,240 Q240,200 280,160', target: 'captions', label: 'Captions' },
  { d: 'M200,240 Q200,190 200,130', target: 'graph', label: 'Graph' },
  { d: 'M200,240 Q170,210 140,180', target: 'left', label: '' },
  { d: 'M200,240 Q230,210 260,180', target: 'right', label: '' },
]

function OpenNotebookVisual() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <div className="relative w-full max-w-lg mx-auto h-[300px] md:h-[340px]">
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={
          prefersReducedMotion
            ? { opacity: 0.1 }
            : { opacity: [0.08, 0.16, 0.08], scale: [0.97, 1.03, 0.97] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(circle, rgba(var(--color-accent-rgb),0.12) 0%, transparent 68%)',
        }}
      />

      <svg viewBox="0 0 400 300" className="w-full h-full relative z-10 pointer-events-none">
        <defs>
          <linearGradient id="notebookLine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {connections.map((c, i) => (
          <motion.path
            key={i}
            d={c.d}
            fill="none"
            stroke="url(#notebookLine)"
            strokeWidth="1.25"
            strokeDasharray="4 6"
            animate={
              prefersReducedMotion
                ? { pathLength: 1, opacity: 0.4 }
                : { pathLength: [0, 1, 1], opacity: [0.15, 0.55, 0.3] }
            }
            transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          />
        ))}

        {[
          { cx: 145, cy: 105 },
          { cx: 255, cy: 100 },
          { cx: 200, cy: 75 },
          { cx: 170, cy: 130 },
          { cx: 230, cy: 125 },
          { cx: 185, cy: 90 },
        ].map((spark, i) => (
          <motion.circle
            key={i}
            cx={spark.cx}
            cy={spark.cy}
            r={2}
            fill="#EF4444"
            animate={
              prefersReducedMotion
                ? {}
                : { opacity: [0.2, 0.9, 0.2], r: [1.5, 2.5, 1.5] }
            }
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute top-[18%] left-[18%] floating-card rounded-lg p-2.5 border-accent/20 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.1)] cursor-pointer"
        animate={prefersReducedMotion ? {} : { y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Layers className="h-3.5 w-3.5 text-accent mb-1" />
        <p className="text-[9px] text-muted">Flashcards</p>
      </motion.div>

      <motion.div
        className="absolute top-[14%] right-[16%] floating-card rounded-lg p-2.5 border-red/20 cursor-pointer"
        animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }}
      >
        <Mic className="h-3.5 w-3.5 text-red mb-1" />
        <p className="text-[9px] text-muted">Captions</p>
      </motion.div>

      <motion.div
        className="absolute top-[8%] left-1/2 -translate-x-1/2 floating-card rounded-lg p-2.5 border-[#4F46E5]/25 cursor-pointer"
        animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
      >
        <Network className="h-3.5 w-3.5 text-accent mb-1" />
        <p className="text-[9px] text-muted">Graph</p>
      </motion.div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-52 md:w-60">
        <motion.div
          className="relative rounded-t-xl bg-card border border-white/[0.1] border-b-0 overflow-hidden"
          animate={prefersReducedMotion ? {} : { scale: [1, 1.01, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-accent/20 border-r border-accent/10" />
          <div className="pl-6 pr-4 pt-4 pb-6 space-y-2.5">
            {[85, 70, 90, 55].map((w, i) => (
              <motion.div
                key={i}
                className="h-0.5 rounded bg-white/[0.08]"
                style={{ width: `${w}%` }}
                animate={prefersReducedMotion ? {} : { opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.06] to-transparent pointer-events-none" />
        </motion.div>
        <div className="h-1 mx-4 bg-white/[0.04] rounded-b" />
      </div>
    </div>
  )
}

export function CTASection() {
  return (
    <Section className="relative overflow-hidden">
      <BackgroundDepth variant="cta" />
      <ParticleField count={25} yellowRatio={0.5} className="opacity-50" />

      <FadeUp>
        <div className="relative glass-card rounded-3xl p-8 md:p-16 text-center overflow-hidden border-accent/15">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <OpenNotebookVisual />

          <div className="relative mt-6 md:mt-8">
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground leading-[0.92]">
              Built for students.
            </h2>
            <p className="font-heading text-2xl md:text-4xl text-gradient-pulse mt-2 leading-[0.92]">
              Open for everyone.
            </p>
            <p className="mt-6 text-muted text-lg max-w-xl mx-auto leading-relaxed">
              Designed to make learning unforgettable. Explore the project,
              read the source, and build with us.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <MagneticButton>
                <a href="#architecture" className="cursor-pointer">
                  <Button variant="primary" size="lg" className="gap-2">
                    Explore Project
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </MagneticButton>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <Button variant="secondary" size="lg" className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </FadeUp>
    </Section>
  )
}
