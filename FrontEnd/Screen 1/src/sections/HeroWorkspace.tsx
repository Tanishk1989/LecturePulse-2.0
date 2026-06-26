import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Mic, Layers, Target, Calendar, Bot } from 'lucide-react'
import { AnimatedWaveform } from '@/components/shared/AnimatedWaveform'
import { ParticleField } from '@/components/effects/ParticleField'
import { BackgroundDepth } from '@/components/effects/BackgroundDepth'

const graphNodes = [
  { x: 200, y: 120, label: 'Calculus', status: 'learning' },
  { x: 120, y: 60, label: 'Limits', status: 'mastered' },
  { x: 280, y: 60, label: 'Derivatives', status: 'learning' },
  { x: 100, y: 180, label: 'Integrals', status: 'weak' },
  { x: 300, y: 180, label: 'Linear Alg.', status: 'unexplored' },
  { x: 200, y: 200, label: 'Eigenvalues', status: 'weak' },
]

const edges = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 2],
  [3, 5],
]

const statusColors: Record<string, string> = {
  mastered: '#10B981',
  learning: 'var(--color-accent)',
  weak: '#EF4444',
  unexplored: '#52525B',
}

const floatingCards = [
  {
    id: 'captions',
    icon: Mic,
    title: 'Live Captions',
    lines: ['"The eigenvalue λ satisfies..."', '"det(A − λI) = 0..."'],
    showWaveform: true,
    position: { top: '6%', left: '2%' },
    mdPosition: { top: '6%', left: '4%' },
    delay: 0,
    accent: 'red' as const,
  },
  {
    id: 'flashcards',
    icon: Layers,
    title: 'Flashcards',
    lines: ['Q: Define eigenvalue', 'A: Scalar λ where Av = λv...'],
    position: { top: '4%', right: '2%' },
    mdPosition: { top: '4%', right: '4%' },
    delay: 0.5,
    accent: 'yellow' as const,
  },
  {
    id: 'exam',
    icon: Target,
    title: 'Exam Focus',
    lines: ["Stoke's Theorem", '94% confidence'],
    position: { bottom: '10%', left: '2%' },
    mdPosition: { bottom: '10%', left: '6%' },
    delay: 1,
    accent: 'red' as const,
  },
  {
    id: 'review',
    icon: Calendar,
    title: "Today's Review",
    lines: ['12 cards due', '18 min'],
    position: { bottom: '6%', right: '2%' },
    mdPosition: { bottom: '6%', right: '6%' },
    delay: 1.5,
    accent: 'yellow' as const,
  },
  {
    id: 'tutor',
    icon: Bot,
    title: 'AI Tutor',
    lines: ['Struggling with Eigenvalues?'],
    showExplain: true,
    position: { top: '42%', right: '0%' },
    mdPosition: { top: '42%', right: '1%' },
    delay: 2,
    accent: 'red' as const,
  },
]

function FloatingCard({
  card,
  parallax,
}: {
  card: (typeof floatingCards)[0]
  parallax: { x: number; y: number }
}) {
  const prefersReducedMotion = useReducedMotion()
  const isRed = card.accent === 'red'

  return (
    <motion.div
      className="absolute z-20 w-[150px] md:w-[180px] cursor-pointer"
      style={{
        top: card.position.top,
        left: card.position.left,
        right: card.position.right,
        bottom: card.position.bottom,
      }}
      animate={
        prefersReducedMotion
          ? {}
          : {
              y: [0, -12, 0],
              rotate: [0, 0.4, 0, -0.4, 0],
              x: parallax.x * (card.id === 'captions' ? 0.8 : 0.5),
            }
      }
      transition={{
        y: { duration: 5 + card.delay, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
        rotate: { duration: 6 + card.delay, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
        x: { type: 'spring', stiffness: 120, damping: 20 },
      }}
    >
      <div
        className={`floating-card glow-hover rounded-xl p-3 md:p-4 ${
          isRed
            ? 'border-red/20 shadow-[0_0_24px_rgba(239,68,68,0.1)]'
            : 'border-accent/15 shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.08)]'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <card.icon className={`h-3.5 w-3.5 ${isRed ? 'text-red' : 'text-accent'}`} />
          <span className="text-[10px] font-semibold text-foreground">{card.title}</span>
        </div>
        {card.showWaveform && <AnimatedWaveform className="mb-2" height={16} bars={8} />}
        <div className="space-y-1">
          {card.lines.map((line) => (
            <p key={line} className="text-[9px] md:text-[10px] text-muted leading-relaxed">
              {line}
            </p>
          ))}
        </div>
        {card.showExplain && (
          <span className="mt-2 inline-block text-[9px] px-2 py-0.5 rounded bg-red/10 text-red border border-red/20">
            Explain
          </span>
        )}
        {card.id === 'exam' && (
          <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-red/70 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '94%' }}
              transition={{ duration: 1.5, delay: 0.5 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function HeroWorkspace() {
  const prefersReducedMotion = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / rect.width
    const y = (e.clientY - rect.top - rect.height / 2) / rect.height
    setMouse({ x: x * 12, y: y * 8 })
  }

  const handleMouseLeave = () => setMouse({ x: 0, y: 0 })

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] md:h-[620px] mx-auto max-w-5xl"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <BackgroundDepth variant="section" className="rounded-3xl" />
      <div className="absolute inset-0 bg-[#10B981]/[0.04] blur-3xl rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <ParticleField count={45} yellowRatio={0.35} />

      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <defs>
          <linearGradient id="heroLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0" />
            <stop offset="40%" stopColor="var(--color-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {[
          { x1: '50%', y1: '50%', x2: '14%', y2: '12%' },
          { x1: '50%', y1: '50%', x2: '86%', y2: '10%' },
          { x1: '50%', y1: '50%', x2: '16%', y2: '84%' },
          { x1: '50%', y1: '50%', x2: '84%', y2: '88%' },
          { x1: '50%', y1: '50%', x2: '94%', y2: '46%' },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="url(#heroLineGrad)"
            strokeWidth="1.5"
            strokeDasharray="6 8"
            filter="url(#lineGlow)"
            animate={
              prefersReducedMotion
                ? { opacity: 0.4 }
                : { strokeDashoffset: [0, -28], opacity: [0.25, 0.65, 0.25] }
            }
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25, ease: 'linear' }}
          />
        ))}
      </svg>

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        animate={
          prefersReducedMotion
            ? {}
            : { y: [0, -10, 0], x: mouse.x * 0.3 }
        }
        transition={{
          y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          x: { type: 'spring', stiffness: 80, damping: 20 },
        }}
      >
        <div className="floating-card rounded-2xl p-5 w-[300px] md:w-[360px] shadow-[0_0_80px_rgba(79,70,229,0.2),0_0_40px_rgba(16,185,129,0.08)] border-[#4F46E5]/20 cursor-pointer glow-hover">
          <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-accent mb-3">
            Smart Notes
          </div>
          <svg viewBox="0 0 400 240" className="w-full">
            {edges.map(([from, to], i) => {
              const a = graphNodes[from]
              const b = graphNodes[to]
              return (
                <motion.line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="rgba(var(--color-accent-rgb),0.35)"
                  strokeWidth="1.5"
                  animate={prefersReducedMotion ? {} : { opacity: [0.25, 0.75, 0.25] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                />
              )
            })}
            {graphNodes.map((node, i) => (
              <g key={node.label} className="cursor-pointer">
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={9}
                  fill={statusColors[node.status]}
                  animate={
                    prefersReducedMotion
                      ? {}
                      : { opacity: [0.65, 1, 0.65], r: node.status === 'weak' ? [8, 10, 8] : [8, 9.5, 8] }
                  }
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25 }}
                  style={{
                    filter:
                      node.status === 'weak'
                        ? 'drop-shadow(0 0 8px rgba(239,68,68,0.7))'
                        : node.status === 'learning'
                          ? 'drop-shadow(0 0 8px rgba(var(--color-accent-rgb),0.55))'
                          : node.status === 'mastered'
                            ? 'drop-shadow(0 0 6px rgba(16,185,129,0.5))'
                            : 'none',
                  }}
                />
                <text x={node.x} y={node.y + 22} textAnchor="middle" fill="#A1A1AA" fontSize="10">
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </motion.div>

      <div className="hidden md:block">
        {floatingCards.map((card) => (
          <FloatingCard key={card.id} card={card} parallax={mouse} />
        ))}
      </div>

      <div className="md:hidden absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 z-20">
        {floatingCards.slice(0, 4).map((card) => (
          <div
            key={card.id}
            className={`floating-card rounded-lg p-2.5 cursor-pointer ${
              card.accent === 'red' ? 'border-red/15' : 'border-accent/10'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <card.icon className={`h-3 w-3 ${card.accent === 'red' ? 'text-red' : 'text-accent'}`} />
              <span className="text-[9px] font-medium">{card.title}</span>
            </div>
            <p className="text-[8px] text-muted truncate">{card.lines[0]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
