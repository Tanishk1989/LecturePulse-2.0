import type { LucideIcon } from 'lucide-react'
import { NAV_ICON_SIZE, NAV_ICON_STROKE } from '@/config/dashboardNav'
import { cn } from '@/lib/utils'

interface DashboardNavIconProps {
  icon: LucideIcon
  active?: boolean
  className?: string
}

export function DashboardNavIcon({ icon: Icon, active = false, className }: DashboardNavIconProps) {
  return (
    <Icon
      size={NAV_ICON_SIZE}
      strokeWidth={NAV_ICON_STROKE}
      className={cn(
        'shrink-0 transition-all duration-300',
        active
          ? 'text-accent drop-shadow-[0_0_10px_rgba(214,162,11,0.45)]'
          : 'text-foreground/65 group-hover:text-foreground group-hover:scale-105',
        className,
      )}
    />
  )
}
