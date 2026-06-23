import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  List,
  Mic,
  Network,
  NotebookPen,
  Sparkles,
  Target,
  Waves,
} from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { cn } from '@/lib/utils'

type FeatureCard = {
  id: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  accent: string
  iconBg: string
  glow: string
}

const features: FeatureCard[] = [
  {
    id: 'record',
    title: 'Live Recording',
    description: 'Capture lectures in real time with waveform preview.',
    href: '/dashboard/record',
    icon: Mic,
    accent: 'text-red',
    iconBg: 'border-red/25 bg-red/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(239,68,68,0.12)]',
  },
  {
    id: 'import',
    title: 'Import Lectures',
    description: 'Upload audio, video, PDF, or YouTube — processed automatically.',
    href: '/dashboard/upload',
    icon: Waves,
    accent: 'text-accent',
    iconBg: 'border-accent/25 bg-accent/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.12)]',
  },
  {
    id: 'notes',
    title: 'Smart Notes',
    description: 'AI-generated study notes from every lecture.',
    href: '/dashboard/notes',
    icon: NotebookPen,
    accent: 'text-ambient',
    iconBg: 'border-ambient/25 bg-ambient/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(79,70,229,0.12)]',
  },
  {
    id: 'summary',
    title: 'Summary',
    description: 'On-demand AI summaries for any lecture or your whole library.',
    href: '/dashboard/summary',
    icon: List,
    accent: 'text-accent',
    iconBg: 'border-accent/25 bg-accent/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.12)]',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Spaced repetition that brings weak cards back sooner.',
    href: '/dashboard/flashcards',
    icon: Brain,
    accent: 'text-emerald',
    iconBg: 'border-emerald/25 bg-emerald/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(16,185,129,0.12)]',
  },
  {
    id: 'graph',
    title: 'Knowledge Graph',
    description: 'See how concepts connect across your library.',
    href: '/dashboard/knowledge-graph',
    icon: Network,
    accent: 'text-violet-400',
    iconBg: 'border-violet-500/25 bg-violet-500/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(139,92,246,0.12)]',
  },
  {
    id: 'exam',
    title: 'Exam Focus',
    description: 'AI prep built from notes and weak spots.',
    href: '/dashboard/exam-focus',
    icon: Target,
    accent: 'text-accent',
    iconBg: 'border-accent/25 bg-accent/[0.1]',
    glow: 'group-hover:shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.1)]',
  },
]

export function DashboardFeaturesStrip() {
  return (
    <FadeUp delay={0.05}>
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                What makes LecturePulse special
              </p>
            </div>
            <h2 className="mt-1 font-heading text-xl text-foreground md:text-2xl">
              Your full learning stack
            </h2>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <FadeUp key={feature.id} delay={0.06 + index * 0.03}>
                <Link
                  to={feature.href}
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
                    'bg-[#0c0c0c]/90 p-5 backdrop-blur-xl transition-all duration-300',
                    'hover:-translate-y-1 hover:border-white/[0.14]',
                    feature.glow,
                  )}
                >
                  <div
                    className={cn(
                      'mb-4 flex h-11 w-11 items-center justify-center rounded-xl border',
                      feature.iconBg,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', feature.accent)} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                  <span
                    className={cn(
                      'mt-4 text-xs font-medium transition-colors',
                      feature.accent,
                      'opacity-70 group-hover:opacity-100',
                    )}
                  >
                    Explore →
                  </span>
                </Link>
              </FadeUp>
            )
          })}
        </div>
      </section>
    </FadeUp>
  )
}
