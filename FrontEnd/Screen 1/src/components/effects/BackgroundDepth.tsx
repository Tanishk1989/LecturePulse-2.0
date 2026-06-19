import { cn } from '@/lib/utils'

interface BackgroundDepthProps {
  className?: string
  variant?: 'hero' | 'section' | 'architecture' | 'cta'
}

export function BackgroundDepth({ className, variant = 'section' }: BackgroundDepthProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 opacity-[0.04] bg-noise" />

      {variant === 'hero' && (
        <>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-[#D6A20B]/[0.10] blur-[160px]" />
          <div className="absolute top-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-[#D6A20B]/[0.06] blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-[#4F46E5]/[0.06] blur-[90px]" />
        </>
      )}

      {variant === 'section' && (
        <>
          <div className="absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-[#4F46E5]/[0.08] blur-[120px]" />
          <div className="absolute -bottom-32 left-0 h-[400px] w-[400px] rounded-full bg-[#10B981]/[0.06] blur-[100px]" />
        </>
      )}

      {variant === 'architecture' && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[900px] w-[900px] rounded-full bg-[#4F46E5]/[0.12] blur-[180px]" />
          <div className="absolute top-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-[#4F46E5]/[0.08] blur-[60px]" />
        </>
      )}

      {variant === 'cta' && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#D6A20B]/[0.10] blur-[140px]" />
          <div className="absolute top-1/3 right-1/3 h-[400px] w-[400px] rounded-full bg-[#D6A20B]/[0.06] blur-[100px]" />
        </>
      )}

      <div className="absolute inset-0 star-particles opacity-[0.12]" />
    </div>
  )
}
