import { PulseIcon } from '@/components/shared/PulseIcon'
import { cn } from '@/lib/utils'

interface PulseFabIconProps {
  size?: number
  className?: string
}

/** Circular gold-ring Pulse button icon (brand FAB). */
export function PulseFabIcon({ size = 56, className }: PulseFabIconProps) {
  const iconSize = Math.round(size * 0.46)

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        'bg-[#0a0a0a] border-2 border-accent/35',
        'shadow-[0_0_32px_rgba(214,162,11,0.22),0_0_64px_rgba(214,162,11,0.12)]',
        'transition-all duration-300',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(214,162,11,0.08) 0%, transparent 70%)',
        }}
      />
      <PulseIcon size={iconSize} glow />
    </div>
  )
}
