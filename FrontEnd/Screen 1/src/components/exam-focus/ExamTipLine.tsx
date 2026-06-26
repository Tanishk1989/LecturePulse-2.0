import { parseExamTipLine } from '@/lib/formatExamTip'
import { cn } from '@/lib/utils'

const MISTAKE_HEADING_COLORS = [
  'text-amber-400',
  'text-sky-400',
  'text-emerald-400',
  'text-violet-400',
  'text-rose-400',
  'text-cyan-400',
] as const

interface ExamTipLineProps {
  text: string
  variant?: 'default' | 'mistake' | 'hero'
  className?: string
  index?: number
}

export function ExamTipLine({ text, variant = 'default', className, index = 0 }: ExamTipLineProps) {
  const { title, description } = parseExamTipLine(text)

  if (!title) return null

  if (variant === 'hero') {
    return (
      <div className={className}>
        <p className="font-heading text-3xl text-foreground leading-tight">{title}</p>
        {description && (
          <p className="mt-3 text-sm text-muted leading-relaxed max-w-xl">{description}</p>
        )}
      </div>
    )
  }

  if (variant === 'mistake') {
    const headingColor = MISTAKE_HEADING_COLORS[index % MISTAKE_HEADING_COLORS.length]
    return (
      <li className={cn('py-3', className)}>
        <p className={cn('text-sm font-semibold leading-snug', headingColor)}>{title}</p>
        {description && (
          <p className="mt-1.5 text-sm text-muted leading-relaxed">{description}</p>
        )}
      </li>
    )
  }

  return (
    <li className={cn('flex items-start gap-3', className)}>
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted leading-relaxed line-clamp-3">{description}</p>
        )}
      </div>
    </li>
  )
}
