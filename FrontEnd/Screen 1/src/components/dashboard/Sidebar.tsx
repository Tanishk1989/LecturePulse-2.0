import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { dashboardNavSections } from '@/config/dashboardNav'
import { DashboardNavIcon } from '@/components/dashboard/ui/DashboardNavIcon'
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2.5 px-1 shrink-0">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.06]"
        style={{ boxShadow: '0 0 16px rgba(214,162,11,0.12)' }}
      >
        <PulseIcon size={22} />
      </div>
      <span className="font-heading text-lg">
        <span className="text-foreground">Lecture</span>
        <span className="text-accent" style={{ textShadow: '0 0 20px rgba(214,162,11,0.25)' }}>
          Pulse
        </span>
      </span>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
        <SidebarLogo />
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

      <nav className="flex-1 overflow-hidden px-3 py-4 space-y-5">
        {dashboardNavSections.map((section) => (
          <div key={section.id}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname.startsWith(item.path)

                return (
                  <li key={item.id}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-3 rounded-full px-3 py-2 text-[13px] transition-all duration-300 cursor-pointer',
                        isActive
                          ? 'bg-accent/[0.12] text-accent border-l-2 border-accent shadow-[0_0_24px_rgba(214,162,11,0.12)] pl-[10px]'
                          : 'text-muted hover:text-foreground hover:bg-white/[0.03] border-l-2 border-transparent',
                      )}
                    >
                      <DashboardNavIcon icon={item.icon} active={isActive} />
                      <span className={cn(isActive && 'font-medium')}>{item.label}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-xs text-muted hover:text-foreground hover:border-accent/20 hover:shadow-[0_0_20px_rgba(214,162,11,0.08)] transition-all duration-300 cursor-pointer"
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
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:flex-col lg:overflow-hidden lg:border-r lg:border-white/[0.08] lg:bg-background">
      <SidebarContent />
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
            className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/[0.08] bg-background lg:hidden overflow-hidden"
          >
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
