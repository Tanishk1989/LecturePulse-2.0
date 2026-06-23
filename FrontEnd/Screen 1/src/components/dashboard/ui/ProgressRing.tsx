import { cn } from '@/lib/utils'

interface ProgressRingProps {
  progress?: number | null
  size?: number
  strokeWidth?: number
  className?: string
  color?: 'gold' | 'emerald' | 'indigo'
  loading?: boolean
  gradient?: boolean
  centerLabel?: string
  centerSubLabel?: string
  centerLabelGold?: boolean
  animated?: boolean
}

const colorMap = {
  gold: { stroke: 'var(--color-accent)', glow: 'rgba(var(--color-accent-rgb),0.4)' },
  emerald: { stroke: '#10B981', glow: 'rgba(16,185,129,0.35)' },
  indigo: { stroke: '#4F46E5', glow: 'rgba(79,70,229,0.35)' },
}

export function ProgressRing({
  progress = null,
  size = 64,
  strokeWidth = 4,
  className,
  color = 'gold',
  loading = false,
  gradient = false,
  centerLabel,
  centerSubLabel,
  centerLabelGold = false,
  animated = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const normalized = progress == null ? 0 : Math.min(100, Math.max(0, progress))
  const offset = circumference - (normalized / 100) * circumference
  const { stroke, glow } = colorMap[color]
  const gradientId = `progress-gradient-${size}-${color}`

  const displayValue = loading ? null : progress != null ? `${normalized}%` : centerLabel ?? '0%'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className={cn('-rotate-90', animated && 'animate-[spin_20s_linear_infinite]')}>
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" />
              <stop offset="50%" stopColor="#FFE27A" />
              <stop offset="100%" stopColor="#FFF2B3" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {!loading && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gradient ? `url(#${gradientId})` : stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {loading ? (
          <span className="h-3 w-6 animate-pulse rounded bg-white/[0.08]" />
        ) : (
          <>
            <span
              className={cn(
                'font-heading leading-none',
                centerLabelGold ? 'text-2xl text-accent' : 'text-xl text-foreground',
              )}
            >
              {displayValue}
            </span>
            {centerSubLabel && (
              <span className="text-[11px] text-muted mt-1.5">{centerSubLabel}</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
