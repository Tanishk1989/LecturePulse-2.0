import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sun, Moon } from 'lucide-react'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { dashboardNavSections } from '@/config/dashboardNav'
import { DashboardNavIcon } from '@/components/dashboard/ui/DashboardNavIcon'
import { SidebarAddLectureItem } from '@/components/dashboard/SidebarAddLectureItem'
import { useDashboard } from '@/context/DashboardContext'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'

function SidebarLogo({ isDrawer, onToggle }: { isDrawer: boolean; onToggle?: () => void }) {
  return (
    <div
      onClick={!isDrawer ? onToggle : undefined}
      className={cn(
        'flex items-center gap-2.5 px-1 shrink-0',
        !isDrawer && 'cursor-pointer hover:opacity-85 transition-opacity duration-200'
      )}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.06]"
        style={{ boxShadow: '0 0 16px rgba(var(--color-accent-rgb),0.12)' }}
      >
        <PulseIcon size={22} />
      </div>
      <span className={cn('font-heading text-lg', isDrawer ? 'block' : 'hidden lg:block')}>
        <span className="text-foreground">Lecture</span>
        <span className="text-accent" style={{ textShadow: '0 0 20px rgba(var(--color-accent-rgb),0.25)' }}>
          Pulse
        </span>
      </span>
    </div>
  )
}

function SidebarContent({ onNavigate, isDrawer = true }: { onNavigate?: () => void; isDrawer?: boolean }) {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { toggleSidebar } = useDashboard()

  return (
    <div className="flex h-full flex-col overflow-visible">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <SidebarLogo isDrawer={isDrawer} onToggle={toggleSidebar} />
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="lg:hidden p-1.5 text-muted hover:text-foreground cursor-pointer transition-colors duration-300"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <ScrollFadeContainer
        fadeColor="var(--sidebar-bg)"
        className={cn(
          'flex-1 py-4',
          isDrawer ? 'pl-4 pr-3' : 'pl-3 pr-2 lg:pl-4 lg:pr-3'
        )}
      >
        <nav className="space-y-5">
          {dashboardNavSections.map((section) => (
            <div key={section.id}>
              <p className={cn(
                'px-3 mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted',
                isDrawer ? 'block' : 'hidden lg:block'
              )}>
                {section.title}
              </p>
              <ul className="space-y-0.5 pl-1">
                {section.id === 'create' ? (
                  <SidebarAddLectureItem onNavigate={onNavigate} isDrawer={isDrawer} />
                ) : (
                  section.items.map((item) => {
                    const path = item.path!
                    const isActive =
                      path === '/dashboard'
                        ? location.pathname === '/dashboard'
                        : location.pathname.startsWith(path)

                    const isStudyHub = item.id === 'study-hub'

                    return (
                      <li key={item.id}>
                        <NavLink
                          to={path}
                          onClick={onNavigate}
                          className={cn(
                            'group flex items-center gap-3 rounded-full px-3 py-2 text-[13px] transition-all duration-300 cursor-pointer',
                            isActive
                              ? 'text-accent border-l-[3px] border-accent pl-[10px]'
                              : 'text-muted hover:text-foreground border-l-[3px] border-transparent',
                            isStudyHub
                              ? 'study-hub-glow'
                              : isActive
                                ? 'bg-gradient-to-r from-accent/12 to-transparent'
                                : 'hover:bg-white/[0.03]',
                          )}
                        >
                          <DashboardNavIcon icon={item.icon} active={isActive} id={item.id} />
                          <span className={cn(isActive && 'font-medium', isDrawer ? 'block' : 'hidden lg:block')}>{item.label}</span>
                        </NavLink>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollFadeContainer>

      <div className={cn('py-4 border-t border-border shrink-0 flex items-center gap-2', isDrawer ? 'px-5' : 'px-3 lg:px-5')}>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'group flex-1 flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-xs text-muted hover:text-foreground hover:border-accent/20 hover:shadow-sm transition-all duration-300 cursor-pointer',
            isDrawer ? 'flex' : 'hidden lg:flex'
          )}
        >
          <svg
            viewBox="0 0 24 24"
            width={18}
            height={18}
            fill="currentColor"
            className="shrink-0 text-foreground/65 group-hover:text-foreground group-hover:scale-105 transition-all duration-300"
            aria-hidden
          >
            <path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.428 2.865 8.178 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.021C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>Open Source</span>
        </a>
        <button
          onClick={toggleTheme}
          className={cn(
            'p-2.5 rounded-xl border border-border bg-white/[0.02] text-muted hover:text-foreground hover:border-accent/20 hover:shadow-sm transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0',
            isDrawer ? 'w-auto' : 'w-full lg:w-auto'
          )}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden sm:flex sm:w-[72px] lg:w-[280px] sm:shrink-0 sm:sticky sm:top-0 sm:h-screen sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-r sm:border-border sm:bg-[var(--sidebar-bg)]">
      <SidebarContent isDrawer={false} />
    </aside>
  )
}

export function MobileSidebarDrawer() {
  const { sidebarOpen, setSidebarOpen } = useDashboard()

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-[var(--sidebar-bg)] lg:hidden overflow-x-visible overflow-y-auto"
          >
            <SidebarContent onNavigate={() => setSidebarOpen(false)} isDrawer={true} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
