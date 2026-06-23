import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus } from 'lucide-react'
import { uploadActions } from '@/config/dashboardNav'
import { DashboardNavIcon } from '@/components/dashboard/ui/DashboardNavIcon'
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'

interface SidebarAddLectureItemProps {
  onNavigate?: () => void
  isDrawer?: boolean
}

export function SidebarAddLectureItem({ onNavigate, isDrawer = true }: SidebarAddLectureItemProps) {
  const location = useLocation()
  const { toggleSidebar } = useDashboard()
  const createFlowPaths = uploadActions.map((action) => action.path)
  const isCreateActive = createFlowPaths.some((path) => location.pathname.startsWith(path))
  const [open, setOpen] = useState(isCreateActive)

  const [showPulse, setShowPulse] = useState(() => {
    return sessionStorage.getItem('lecturepulse:sidebar:add_lecture_interacted') !== 'true'
  })
  const [isPulsing, setIsPulsing] = useState(false)

  useEffect(() => {
    if (!showPulse) return

    // Trigger initial pulse on mount
    setIsPulsing(true)
    const initialTimer = setTimeout(() => {
      setIsPulsing(false)
    }, 750)

    // Repeat pulse every 9 seconds
    const interval = setInterval(() => {
      setIsPulsing(true)
      setTimeout(() => {
        setIsPulsing(false)
      }, 750)
    }, 9000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [showPulse])

  const handleBtnClick = () => {
    setOpen((prev) => !prev)
    if (showPulse) {
      sessionStorage.setItem('lecturepulse:sidebar:add_lecture_interacted', 'true')
      setShowPulse(false)
      setIsPulsing(false)
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={handleBtnClick}
        aria-expanded={open}
        aria-controls="sidebar-add-lecture-menu"
        className={cn(
          'group flex w-full items-center gap-3 rounded-full px-3 py-2 text-[13px] transition-all duration-300 cursor-pointer',
          isCreateActive
            ? 'bg-gradient-to-r from-accent/12 to-transparent text-accent border-l-[3px] border-accent pl-[10px]'
            : 'text-muted hover:text-foreground hover:bg-white/[0.03] border-l-[3px] border-transparent',
          isPulsing && 'pulse-active',
        )}
      >
        <DashboardNavIcon icon={Plus} active={isCreateActive} id="add-lecture" />
        <span className={cn('flex-1 text-left', isCreateActive && 'font-medium', isDrawer ? 'block' : 'hidden lg:block')}>Add lecture</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted transition-transform duration-200',
            open && 'rotate-180',
            isCreateActive && 'text-accent',
            isDrawer ? 'block' : 'hidden lg:block'
          )}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id="sidebar-add-lecture-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="overflow-x-visible overflow-y-hidden mt-0.5 space-y-0.5 pl-1"
          >
            {uploadActions.map((action) => {
              const isActive = location.pathname.startsWith(action.path)

              return (
                <li key={action.id}>
                  <NavLink
                    to={action.path}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 rounded-full py-2 pr-3 text-[13px] transition-all duration-300 cursor-pointer',
                      isActive
                        ? `bg-gradient-to-r from-accent/12 to-transparent text-accent border-l-[3px] border-accent ${isDrawer ? 'pl-[34px]' : 'pl-[10px] lg:pl-[34px]'}`
                        : `text-muted hover:text-foreground hover:bg-white/[0.03] border-l-[3px] border-transparent ${isDrawer ? 'pl-9' : 'pl-3 lg:pl-9'}`,
                    )}
                  >
                    <DashboardNavIcon icon={action.icon} active={isActive} id={action.id} />
                    <span className={cn(isActive && 'font-medium', isDrawer ? 'block' : 'hidden lg:block')}>{action.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}
