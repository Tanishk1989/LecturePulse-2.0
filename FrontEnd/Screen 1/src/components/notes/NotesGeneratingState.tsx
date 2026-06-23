import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotesGeneratingState({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center px-6 py-20 text-center',
        className,
      )}
    >
      <div className="relative mb-8">
        <div
          className="pointer-events-none absolute -inset-12 rounded-full bg-ambient/[0.12] blur-[80px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -inset-8 rounded-full bg-accent/[0.08] blur-3xl"
          aria-hidden
        />
        <motion.div
          animate={prefersReducedMotion ? {} : { rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.15)]"
        >
          <Sparkles className="h-7 w-7 text-accent" />
        </motion.div>
      </div>

      <p className="text-lg font-semibold text-foreground">Creating your smart notes…</p>
      <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
        AI is reading your lecture and building study material
      </p>

      <div className="mt-10 flex items-center gap-2 text-xs text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ambient" />
        Generating summary, concepts, definitions & more
      </div>

      <div className="mt-10 w-full max-w-md space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0.2 }}
            animate={prefersReducedMotion ? { opacity: 0.4 } : { opacity: [0.2, 0.55, 0.2] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.15 }}
            className="flex gap-4 rounded-2xl border border-accent/[0.06] bg-accent/[0.02] px-4 py-4"
          >
            <div className="h-3 w-12 shrink-0 rounded bg-accent/[0.08]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-full rounded bg-white/[0.06]" />
              <div className="h-3 w-4/5 rounded bg-white/[0.04]" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
