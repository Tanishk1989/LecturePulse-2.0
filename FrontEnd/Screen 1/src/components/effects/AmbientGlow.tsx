import { cn } from '@/lib/utils'

interface AmbientGlowProps {
  className?: string
  variant?: 'default' | 'knowledge'
}

export function AmbientGlow({ className, variant = 'default' }: AmbientGlowProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 opacity-[0.035] bg-noise" />
      {variant === 'knowledge' ? (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[#10B981]/[0.10] blur-[120px]" />
          <div className="absolute -bottom-32 left-0 h-[400px] w-[400px] rounded-full bg-[#10B981]/[0.08] blur-[100px]" />
          <div className="absolute -top-32 right-0 h-[300px] w-[300px] rounded-full bg-[#4F46E5]/[0.05] blur-[80px]" />
        </>
      ) : (
        <>
          <div className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-[#4F46E5]/[0.09] blur-[120px]" />
          <div className="absolute -bottom-32 left-0 h-[400px] w-[400px] rounded-full bg-[#10B981]/[0.07] blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-[var(--color-accent)]/[0.04] blur-[80px]" />
        </>
      )}
    </div>
  )
}
