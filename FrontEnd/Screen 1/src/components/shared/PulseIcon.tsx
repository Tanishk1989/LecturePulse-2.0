import { cn } from '@/lib/utils'

interface PulseIconProps {
  className?: string
  size?: number
  glow?: boolean
}

export function PulseIcon({ className, size = 32, glow = true }: PulseIconProps) {
  const id = `pulse-${size}`

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D6A20B" />
          <stop offset="50%" stopColor="#FFE27A" />
          <stop offset="100%" stopColor="#FFF2B3" />
        </linearGradient>
        {glow && (
          <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      {glow && (
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="rgba(214,162,11,0.12)"
          style={{ filter: 'blur(4px)' }}
        />
      )}
      <path
        d="M3 16 H7 L9 8 L11 24 L13 6 L15 18 L17 12 L19 22 L21 14 L23 16 L29 16"
        stroke={`url(#${id}-grad)`}
        strokeWidth="2.25"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#${id}-glow)` : undefined}
      />
      <path
        d="M13 6 L15 18 L17 12"
        stroke="#FFF2B3"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
