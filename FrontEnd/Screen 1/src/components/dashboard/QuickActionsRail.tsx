import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Upload,
  Layers,
  Target,
  Sparkles,
  MoreHorizontal,
  FileText,
  CalendarClock,
  BarChart3,
} from 'lucide-react'
import { YoutubeIcon } from '@/components/shared/YoutubeIcon'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

interface QuickActionsRailProps {
  onExpandTutor: () => void
  className?: string
}

export function QuickActionsRail({ onExpandTutor, className }: QuickActionsRailProps) {
  const location = useLocation()
  const { theme } = useTheme()
  const [showOverflow, setShowOverflow] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close overflow dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOverflow(false);
      }
    }
    if (showOverflow) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showOverflow])

  const railItems = [
    {
      id: 'record',
      label: 'record',
      icon: Mic,
      path: '/dashboard/record',
      btnClass: 'bg-red/10 hover:bg-red/15 border-red/15 hover:border-red/25 text-red',
    },
    {
      id: 'upload',
      label: 'upload',
      icon: Upload,
      path: '/dashboard/upload',
      btnClass: 'bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.1] text-accent',
    },
    {
      id: 'flashcards',
      label: 'flashcards',
      icon: Layers,
      path: '/dashboard/flashcards',
      btnClass: 'bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.1] text-muted',
    },
    {
      id: 'exam-focus',
      label: 'exam focus',
      icon: Target,
      path: '/dashboard/exam-focus',
      btnClass: 'bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border-white/[0.06] hover:border-white/[0.1] text-muted',
    },
  ]

  const overflowItems = [
    { label: 'Import YouTube', icon: YoutubeIcon as any, path: '/dashboard/youtube' },
    { label: 'Upload PDF', icon: FileText, path: '/dashboard/pdf' },
    { label: 'Revision Timeline', icon: CalendarClock, path: '/dashboard/revision' },
    { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
  ]

  return (
    <div
      id="quick-actions-rail"
      className={cn(
        // Mobile bottom dock layout
        'fixed bottom-4 left-4 right-4 top-auto translate-y-0 z-45 flex flex-row items-center justify-between gap-2.5',
        'floating-card rounded-2xl py-2 px-3 shadow-2xl',
        // Tablet right vertical layout
        'sm:fixed sm:right-2 sm:top-1/2 sm:-translate-y-1/2 sm:bottom-auto sm:left-auto sm:translate-x-0 sm:flex-col sm:items-center sm:gap-1.5 sm:bg-transparent sm:border-0 sm:shadow-none sm:p-0 sm:w-auto',
        // Desktop right vertical layout
        'lg:right-3',
        className
      )}
    >
      {/* Overflow Dropdown & Trigger */}
      <div className="relative" ref={dropdownRef}>
        <AnimatePresence>
          {showOverflow && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'absolute z-50 w-48 floating-card rounded-2xl p-1.5 shadow-2xl flex flex-col gap-0.5',
                // Mobile: above trigger
                'bottom-full right-0 mb-3.5 mr-0',
                // Tablet/Desktop: left of trigger
                'sm:bottom-auto sm:top-0 sm:right-full sm:mr-3.5 sm:mb-0'
              )}
            >
              <div className="px-2.5 py-1.5 text-[9px] font-bold tracking-widest text-muted-secondary uppercase select-none border-b border-white/[0.06] mb-1">
                More Actions
              </div>
              {overflowItems.map((item) => {
                const isItemActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowOverflow(false)}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer',
                      isItemActive
                        ? 'bg-accent/10 text-accent font-semibold'
                        : 'text-muted hover:text-foreground hover:bg-white/[0.04]'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setShowOverflow(!showOverflow)}
          aria-label="More actions"
          title="More actions"
          className="h-10 w-10 sm:h-8 sm:w-8 lg:h-11 lg:w-11 flex items-center justify-center rounded-full bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] text-muted hover:text-foreground transition-all duration-200 cursor-pointer shadow-md select-none"
        >
          <MoreHorizontal className="h-4 w-4 sm:h-3.5 sm:w-3.5 lg:h-5 lg:w-5 shrink-0" />
        </button>
      </div>

      {/* Main Rail Container */}
      <div
        className={cn(
          'quick-actions-rail-inner',
          // Mobile row layout
          'flex flex-1 flex-row items-center justify-between gap-1 bg-transparent border-0 shadow-none p-0 w-auto',
          // Tablet/Desktop column layout
          'sm:floating-card sm:rounded-2xl sm:flex-col sm:items-center sm:gap-1 sm:py-2.5 sm:px-2 sm:shadow-2xl sm:w-[48px]',
          'lg:w-[56px] lg:px-2.5 lg:py-3 lg:gap-1.5'
        )}
      >
        {railItems.map((item) => {
          const isItemActive = location.pathname === item.path
          return (
            <div key={item.id} className="flex flex-col items-center group w-auto sm:w-full shrink-0">
              <Link
                to={item.path}
                className={cn(
                  'flex items-center justify-center rounded-full border transition-all duration-300 cursor-pointer',
                  'h-10 w-10 sm:h-8 sm:w-8 lg:h-11 lg:w-11',
                  item.btnClass,
                  isItemActive && 'ring-2 ring-accent/30 scale-105 border-accent/40 shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.12)]'
                )}
                title={item.label}
              >
                <item.icon className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5 lg:h-5 lg:w-5 shrink-0" strokeWidth={1.75} />
              </Link>
              <span className="text-[10px] font-medium text-muted-secondary tracking-wide select-none mt-1 opacity-50 group-hover:opacity-100 transition-opacity duration-200 text-center w-full truncate hidden lg:block">
                {item.label}
              </span>
            </div>
          )
        })}

        {/* Visual Divider */}
        <div className="h-6 w-px bg-white/[0.08] mx-1 sm:hidden shrink-0" />
        <div className="hidden sm:block sm:h-px sm:w-6 lg:w-8 sm:bg-white/[0.08] sm:my-1 lg:my-1.5 shrink-0" />

        {/* Ask AI - Visually Dominant Filled Button */}
        <div className="flex flex-col items-center group w-auto sm:w-full shrink-0">
          <button
            type="button"
            onClick={onExpandTutor}
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer border',
              'h-10 w-10 sm:h-8 sm:w-8 lg:h-11 lg:w-11',
              'bg-accent hover:bg-accent-soft border-accent/20 hover:border-accent/40 text-background',
              'shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.2)] hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.3)]'
            )}
            title="Ask AI"
          >
            <Sparkles className="h-4.5 w-4.5 sm:h-3.5 sm:w-3.5 lg:h-5 lg:w-5 shrink-0" strokeWidth={2} />
          </button>
          <span className="text-[10px] font-bold text-accent tracking-wide select-none mt-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200 text-center w-full truncate hidden lg:block">
            ask AI
          </span>
        </div>
      </div>
    </div>
  )
}
