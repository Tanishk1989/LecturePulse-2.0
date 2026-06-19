import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { AnimatedWaveform } from '@/components/shared/AnimatedWaveform'
import { cn } from '@/lib/utils'

const transcriptLines = [
  'The eigenvalue λ satisfies...',
  'det(A − λI) = 0...',
  'Av = λv for non-zero v...',
]

interface LiveTranscriptCardProps {
  className?: string
  compact?: boolean
}

export function LiveTranscriptCard({ className, compact = false }: LiveTranscriptCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const [visibleLines, setVisibleLines] = useState(1)
  const [timer, setTimer] = useState('00:22:14')

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleLines(transcriptLines.length)
      return
    }
    const interval = setInterval(() => {
      setVisibleLines((v) => (v >= transcriptLines.length ? 1 : v + 1))
    }, 2800)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setTimer((t) => {
        const [h, m, s] = t.split(':').map(Number)
        let sec = s + 1
        let min = m
        let hr = h
        if (sec >= 60) {
          sec = 0
          min++
        }
        if (min >= 60) {
          min = 0
          hr++
        }
        return [hr, min, sec].map((n) => String(n).padStart(2, '0')).join(':')
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  return (
    <motion.div
      className={cn(
        'relative floating-card rounded-2xl overflow-hidden cursor-pointer',
        'border border-red/20 shadow-[0_0_40px_rgba(239,68,68,0.12),0_0_80px_rgba(79,70,229,0.08)]',
        'hover:border-red/30 hover:shadow-[0_0_50px_rgba(239,68,68,0.18),0_0_100px_rgba(79,70,229,0.12)]',
        'transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02]',
        compact ? 'p-4' : 'p-5 md:p-6',
        className,
      )}
      animate={prefersReducedMotion ? {} : { boxShadow: ['0 0 40px rgba(239,68,68,0.08)', '0 0 60px rgba(239,68,68,0.14)', '0 0 40px rgba(239,68,68,0.08)'] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-[#4F46E5]/15 blur-2xl pointer-events-none" />
      <div className="absolute top-4 right-4 h-1 w-1 rounded-full bg-accent/40 pointer-events-none" />
      <div className="absolute bottom-8 right-12 h-0.5 w-0.5 rounded-full bg-accent/30 pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red/10 border border-red/25">
            <Mic className="h-4 w-4 text-red" />
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red" />
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-red">Live</span>
          </div>
        </div>
        <span className="font-mono text-xs text-muted tabular-nums">{timer}</span>
      </div>

      <AnimatedWaveform className="mb-5" height={compact ? 20 : 28} />

      <div className="space-y-2 min-h-[72px]">
        {transcriptLines.slice(0, visibleLines).map((line, i) => (
          <motion.p
            key={line}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className={cn(
              'text-sm leading-relaxed font-light',
              i === visibleLines - 1 ? 'text-foreground' : 'text-muted/70',
            )}
          >
            "{line}"
          </motion.p>
        ))}
        {!prefersReducedMotion && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-red/80 ml-1 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  )
}
