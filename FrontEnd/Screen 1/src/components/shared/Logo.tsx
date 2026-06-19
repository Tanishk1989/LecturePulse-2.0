import { Link } from 'react-router-dom'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5 group cursor-pointer', className)}>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.06] transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:border-accent/40 group-hover:shadow-[0_0_24px_rgba(214,162,11,0.18)]"
        style={{ boxShadow: '0 0 16px rgba(214,162,11,0.12)' }}
      >
        <PulseIcon size={22} />
      </div>
      <span className="font-heading text-lg">
        <span className="text-[#FAFAFA]">Lecture</span>
        <span className="text-accent">Pulse</span>
      </span>
    </Link>
  )
}
