import { motion, useReducedMotion } from 'framer-motion'
import { AnimatedWaveform } from '@/components/shared/AnimatedWaveform'
import { cn } from '@/lib/utils'

interface AuthShowcaseCardsProps {
  parallaxX?: number
  parallaxY?: number
}

export function AuthShowcaseCards({ parallaxX = 0, parallaxY = 0 }: AuthShowcaseCardsProps) {
  const prefersReducedMotion = useReducedMotion()

  const cards = [
    {
      id: 'transcript',
      offset: { x: -8, y: 12, rotate: -2 },
      parallaxFactor: 0.04,
      floatDelay: 0,
      content: <TranscriptCard />,
      className: 'left-[2%] top-[8%] w-[280px] z-30',
    },
    {
      id: 'graph',
      offset: { x: 18, y: -6, rotate: 1.5 },
      parallaxFactor: 0.06,
      floatDelay: 0.8,
      content: <KnowledgeGraphCard />,
      className: 'right-[4%] top-[32%] w-[240px] z-20',
    },
    {
      id: 'exam',
      offset: { x: 6, y: 20, rotate: -1 },
      parallaxFactor: 0.05,
      floatDelay: 1.6,
      content: <ExamFocusCard />,
      className: 'left-[18%] bottom-[6%] w-[260px] z-10',
    },
  ]

  return (
    <div className="relative mt-10 h-[340px] w-full max-w-xl">
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-accent/[0.08] blur-[80px]"
        aria-hidden
      />

      {cards.map((card) => {
        const px = parallaxX * card.parallaxFactor + card.offset.x
        const py = parallaxY * card.parallaxFactor + card.offset.y

        return (
          <div
            key={card.id}
            className={cn('absolute', card.className)}
            style={{
              transform: `translate(${px}px, ${py}px) rotate(${card.offset.rotate}deg)`,
              transition: prefersReducedMotion ? undefined : 'transform 400ms ease-out',
            }}
          >
            <motion.div
              className="auth-showcase-card rounded-2xl p-4"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      y: [0, -8, 0],
                    }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.5, delay: card.floatDelay * 0.15 }
                  : {
                      opacity: { duration: 0.6, delay: card.floatDelay * 0.15 },
                      y: {
                        duration: 5 + card.floatDelay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: card.floatDelay,
                      },
                    }
              }
            >
              {card.content}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}

function TranscriptCard() {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden>
            🎤
          </span>
          <span className="text-xs font-semibold text-foreground">Live Captions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red" />
          </span>
          <span className="text-[9px] font-bold tracking-[0.15em] text-red">LIVE</span>
        </div>
      </div>
      <AnimatedWaveform className="mb-3" height={22} />
      <p className="text-xs leading-relaxed text-muted">
        &ldquo;The eigenvalue λ satisfies...&rdquo;
      </p>
    </>
  )
}

function KnowledgeGraphCard() {
  const nodes = ['Calculus', 'Derivatives', 'Integrals']

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base" aria-hidden>
          🧠
        </span>
        <span className="text-xs font-semibold text-foreground">Knowledge Graph</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        {nodes.map((node, i) => (
          <div key={node} className="flex flex-col items-center">
            <div
              className={cn(
                'rounded-lg border px-3 py-1 text-[10px] font-medium',
                i === 0
                  ? 'border-accent/30 bg-accent/[0.08] text-accent shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.15)]'
                  : 'border-white/[0.08] bg-white/[0.03] text-muted',
              )}
            >
              {node}
            </div>
            {i < nodes.length - 1 && (
              <span className="my-0.5 text-[10px] text-accent/50">↓</span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function ExamFocusCard() {
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-base" aria-hidden>
          🎯
        </span>
        <span className="text-xs font-semibold text-foreground">Exam Focus</span>
      </div>
      <p className="text-sm font-medium text-foreground">Multivariable Calculus</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted">Confidence</span>
          <span className="font-semibold text-accent">94%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
            style={{ width: '94%' }}
          />
        </div>
        <p className="text-xs font-semibold text-emerald">A+ Predicted</p>
      </div>
    </>
  )
}
