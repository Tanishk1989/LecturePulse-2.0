import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type MetricAccent = 'gold' | 'emerald' | 'indigo' | 'red'

interface MetricMiniCardProps {
  label: string
  value: string
  icon: LucideIcon
  accent?: MetricAccent
  className?: string
}

const accentMap: Record<
  MetricAccent,
  { icon: string; glow: string; border: string }
> = {
  gold: {
    icon: 'text-accent',
    glow: 'shadow-[inset_0_1px_0_rgba(var(--color-accent-rgb),0.06)]',
    border: 'border-white/[0.08] hover:border-accent/20',
  },
  emerald: {
    icon: 'text-emerald',
    glow: 'shadow-[inset_0_1px_0_rgba(16,185,129,0.06)]',
    border: 'border-white/[0.08] hover:border-emerald/20',
  },
  indigo: {
    icon: 'text-ambient',
    glow: 'shadow-[inset_0_1px_0_rgba(79,70,229,0.06)]',
    border: 'border-white/[0.08] hover:border-ambient/20',
  },
  red: {
    icon: 'text-red',
    glow: 'shadow-[inset_0_1px_0_rgba(239,68,68,0.06)]',
    border: 'border-white/[0.08] hover:border-red/20',
  },
}

export function MetricMiniCard({
  label,
  value,
  icon: Icon,
  accent = 'gold',
  className,
}: MetricMiniCardProps) {
  const styles = accentMap[accent]

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4',
        'bg-white/[0.03] backdrop-blur-md',
        'transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        styles.border,
        styles.glow,
        className,
      )}
    >
      <div
        className={cn(
          'absolute -top-8 -right-8 h-16 w-16 rounded-full blur-2xl opacity-40 pointer-events-none',
          accent === 'gold' && 'bg-accent/20',
          accent === 'emerald' && 'bg-emerald/20',
          accent === 'indigo' && 'bg-ambient/20',
          accent === 'red' && 'bg-red/20',
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted truncate">{label}</p>
          <p className="mt-1.5 font-heading text-2xl text-foreground leading-none">{value}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] transition-transform duration-300 group-hover:scale-105">
          <Icon className={cn('h-4 w-4', styles.icon)} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}
