import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent'
}

export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase',
        variant === 'default' && 'border border-white/[0.08] bg-white/[0.03] text-muted',
        variant === 'accent' && 'border border-accent/20 bg-accent/10 text-accent',
        className,
      )}
    >
      {children}
    </span>
  )
}
