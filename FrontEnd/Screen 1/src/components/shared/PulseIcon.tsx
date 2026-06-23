import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

interface PulseIconProps {
  className?: string
  size?: number
  glow?: boolean
}

export function PulseIcon({ className, size = 32, glow = true }: PulseIconProps) {
  let theme = 'dark'
  try {
    const themeContext = useTheme()
    theme = themeContext.theme
  } catch {
    // Fallback if rendered outside ThemeProvider
  }

  const isLight = theme === 'light'
  const id = `pulse-${size}`

  const stop1 = 'var(--color-accent)'
  const stop2 = isLight ? '#7A9E14' : '#FFE27A'
  const stop3 = isLight ? '#E4F0C8' : '#FFF2B3'
  const accentPathStroke = isLight ? 'var(--color-accent)' : '#FFF2B3'

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
          <stop offset="0%" stopColor={stop1} />
          <stop offset="50%" stopColor={stop2} />
          <stop offset="100%" stopColor={stop3} />
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
          fill="rgba(var(--color-accent-rgb),0.12)"
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
        stroke={accentPathStroke}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
