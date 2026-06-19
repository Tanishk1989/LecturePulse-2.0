import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ViewAllTasksButtonProps {
  to?: string
  label?: string
  className?: string
}

export function ViewAllTasksButton({
  to = '/dashboard/revision',
  label = 'View all tasks',
  className,
}: ViewAllTasksButtonProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08]',
        'bg-[#0a0a0a]/80 py-3 text-sm font-medium text-accent',
        'hover:border-accent/25 hover:bg-accent/[0.04] hover:shadow-[0_0_24px_rgba(214,162,11,0.08)]',
        'transition-all duration-300 cursor-pointer',
        className,
      )}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}
