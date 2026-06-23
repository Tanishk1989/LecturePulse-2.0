import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardNavIconProps {
  icon: LucideIcon
  active?: boolean
  id?: string
  className?: string
}

function getCategoryColors(id: string) {
  switch (id) {
    // HOME
    case 'dashboard':
      return {
        bg: 'bg-accent/10 dark:bg-accent/15',
        icon: 'text-accent',
      }
    // LEARN
    case 'lectures':
      return {
        bg: 'bg-teal-500/10 dark:bg-teal-500/15',
        icon: 'text-teal-600 dark:text-teal-400',
      }
    case 'notes':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        icon: 'text-blue-600 dark:text-blue-400',
      }
    case 'flashcards':
      return {
        bg: 'bg-pink-500/10 dark:bg-pink-500/15',
        icon: 'text-pink-600 dark:text-pink-400',
      }
    case 'knowledge-graph':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        icon: 'text-amber-600 dark:text-amber-400',
      }
    case 'ai-tutor':
      return {
        bg: 'bg-purple-500/10 dark:bg-purple-500/15',
        icon: 'text-purple-600 dark:text-purple-400',
      }
    case 'exam-focus':
      return {
        bg: 'bg-red-500/10 dark:bg-red-500/15',
        icon: 'text-red-500 dark:text-red-400',
      }
    // PROGRESS
    case 'streak':
    case 'exam-countdown':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        icon: 'text-emerald-600 dark:text-emerald-400',
      }
    // CREATE SUB-ITEMS
    case 'record':
      return {
        bg: 'bg-red-500/10 dark:bg-red-500/15',
        icon: 'text-red-500 dark:text-red-400',
      }
    case 'upload':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        icon: 'text-blue-600 dark:text-blue-400',
      }
    case 'youtube':
      return {
        bg: 'bg-orange-500/10 dark:bg-orange-500/15',
        icon: 'text-orange-600 dark:text-orange-400',
      }
    case 'pdf':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        icon: 'text-emerald-600 dark:text-emerald-400',
      }
    // ACCOUNT / UTILITIES
    case 'study-hub':
      return {
        bg: 'bg-[#0e2233]',
        icon: 'text-[#38bdf8]',
      }
    case 'add-lecture':
      return {
        bg: 'bg-[#1a1428]',
        icon: 'text-[#a78bfa]',
      }
    case 'profile':
    case 'settings':
    case 'help':
    default:
      return {
        bg: 'bg-white/[0.04] dark:bg-white/[0.06]',
        icon: 'text-muted-secondary dark:text-muted',
      }
  }
}

export function DashboardNavIcon({
  icon: Icon,
  active = false,
  id = '',
  className,
}: DashboardNavIconProps) {
  const { bg, icon: iconColor } = getCategoryColors(id)
  const isCustomColor = id === 'study-hub' || id === 'add-lecture'

  return (
    <div
      data-nav-icon={id}
      data-active={active ? 'true' : 'false'}
      className={cn(
        'h-6 w-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-300',
        active && !isCustomColor ? 'bg-accent shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.3)]' : bg,
        className,
      )}
    >
      <Icon
        size={14}
        strokeWidth={2}
        className={cn(
          'transition-all duration-300 shrink-0',
          active && !isCustomColor ? 'text-background' : iconColor,
        )}
      />
    </div>
  )
}
