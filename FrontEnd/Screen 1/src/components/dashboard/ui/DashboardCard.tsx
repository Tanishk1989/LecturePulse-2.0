import { cn } from '@/lib/utils'

interface DashboardCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: 'gold' | 'red' | 'emerald' | 'none'
}

const glowStyles = {
  gold: 'shadow-[0_0_60px_rgba(214,162,11,0.08)] border-accent/15',
  red: 'shadow-[0_0_60px_rgba(239,68,68,0.08)] border-red/15',
  emerald: 'shadow-[0_0_60px_rgba(16,185,129,0.08)] border-emerald/15',
  none: '',
}

export function DashboardCard({
  children,
  className,
  hover = false,
  glow = 'none',
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-card p-7 md:p-8',
        glowStyles[glow],
        hover && 'glow-hover cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
