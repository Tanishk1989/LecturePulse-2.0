import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  CircleHelp,
  Keyboard,
  Loader2,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { CURRENT_CHANGELOG_VERSION } from '@/config/changelog'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/ToastProvider'
import { useDashboard } from '@/context/DashboardContext'
import { loadUserPreferences } from '@/lib/userPreferences'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { cn } from '@/lib/utils'

const settingsSubItems = [
  { id: 'general', label: 'General', path: '/dashboard/settings?section=general' },
  { id: 'notifications', label: 'Notifications', path: '/dashboard/settings?section=notifications' },
  { id: 'privacy', label: 'Privacy & Data', path: '/dashboard/settings?section=privacy' },
  { id: 'billing', label: 'Billing & Plan', path: '/dashboard/settings?section=billing' },
  { id: 'ai', label: 'AI Preferences', path: '/dashboard/settings?section=ai' },
]

const helpSubItems = [
  { id: 'faq', label: 'FAQ & guides', path: '/dashboard/help?section=faq' },
  { id: 'contact', label: 'Contact support', path: '/dashboard/help?section=contact' },
  { id: 'bug', label: 'Report a bug', path: '/dashboard/help?section=bug' },
]

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick?: () => void
  to?: string
  active?: boolean
  badge?: string
  expanded?: boolean
  onToggleExpand?: () => void
  subitems?: { id: string; label: string; path: string }[]
  onClose: () => void
  danger?: boolean
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  to,
  active,
  badge,
  expanded,
  onToggleExpand,
  subitems,
  onClose,
  danger,
}: MenuItemProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-950 select-none">
          {badge}
        </span>
      )}
      {subitems && (
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 text-muted transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
      )}
    </>
  )

  const className = cn(
    'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all cursor-pointer select-none',
    danger
      ? 'text-red hover:bg-red/[0.08]'
      : active
        ? 'bg-accent/[0.1] text-accent font-semibold'
        : 'text-foreground/90 hover:bg-white/[0.05] hover:text-foreground',
  )

  if (to) {
    return (
      <Link to={to} onClick={onClose} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={subitems ? onToggleExpand : onClick}
        className={className}
      >
        {content}
      </button>
      {subitems && expanded && (
        <div className="pl-7 space-y-1.5 mt-1 mb-2.5">
          {subitems.map((sub) => (
            <Link
              key={sub.id}
              to={sub.path}
              onClick={onClose}
              className="block text-xs text-muted hover:text-foreground transition-colors py-1 select-none text-left"
            >
              {sub.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function AccountDropdown() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const { openShortcuts } = useDashboard()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  
  const [settingsExpanded, setSettingsExpanded] = useState(true)
  const [helpExpanded, setHelpExpanded] = useState(true)
  
  const containerRef = useRef<HTMLDivElement>(null)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Student'
  const photoUrl = user?.photoURL

  const hasUnreadChangelog =
    user &&
    loadUserPreferences(user.uid).lastSeenChangelogVersion !== CURRENT_CHANGELOG_VERSION

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleLogout = async () => {
    setLoggingOut(true)
    setOpen(false)
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoggingOut(false)
    }
  }

  if (!user) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 rounded-xl border border-transparent px-1 py-1 hover:border-white/[0.08] hover:bg-white/[0.03] transition-all cursor-pointer animate-fade-in"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent animate-pulse-slow">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden md:inline text-sm text-muted">
          Hello, <span className="text-foreground font-medium">{displayName.split(' ')[0]}</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/[0.1]',
              'bg-card/95 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl',
            )}
            role="menu"
          >
            <div className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase text-muted select-none">
              ACCOUNT
            </div>

            <div className="space-y-0.5 mt-1">
              <MenuItem
                icon={UserRound}
                label="Profile"
                to="/dashboard/profile"
                active={location.pathname === '/dashboard/profile'}
                onClose={() => setOpen(false)}
              />
              <MenuItem
                icon={Settings}
                label="Settings"
                active={location.pathname.startsWith('/dashboard/settings')}
                expanded={settingsExpanded}
                onToggleExpand={() => setSettingsExpanded(!settingsExpanded)}
                subitems={settingsSubItems}
                onClose={() => setOpen(false)}
              />
              <MenuItem
                icon={Keyboard}
                label="Keyboard shortcuts"
                onClick={() => {
                  setOpen(false)
                  openShortcuts()
                }}
                onClose={() => setOpen(false)}
              />
              <MenuItem
                icon={Sparkles}
                label="What's new"
                to="/dashboard/whats-new"
                active={location.pathname === '/dashboard/whats-new'}
                badge={hasUnreadChangelog ? 'NEW' : undefined}
                onClose={() => setOpen(false)}
              />
              <MenuItem
                icon={CircleHelp}
                label="Help"
                active={location.pathname.startsWith('/dashboard/help')}
                expanded={helpExpanded}
                onToggleExpand={() => setHelpExpanded(!helpExpanded)}
                subitems={helpSubItems}
                onClose={() => setOpen(false)}
              />
            </div>

            <hr className="my-2 border-t-[0.5px] border-white/10" />

            <MenuItem
              icon={loggingOut ? Loader2 : LogOut}
              label={loggingOut ? 'Logging out…' : 'Log out'}
              onClick={() => void handleLogout()}
              onClose={() => setOpen(false)}
              danger
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
