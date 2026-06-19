import { cn } from '@/lib/utils'

interface StatBlockProps {
  value: string
  label: string
  className?: string
}

export function StatBlock({ value, label, className }: StatBlockProps) {
  return (
    <div className={cn('text-center', className)}>
      <div className="font-heading text-3xl md:text-4xl text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium tracking-widest uppercase text-muted">{label}</div>
    </div>
  )
}
