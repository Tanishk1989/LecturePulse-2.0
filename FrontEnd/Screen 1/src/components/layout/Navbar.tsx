import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, Sun, Moon } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/ToastProvider'
import { useScrollOpacity } from '@/hooks/useScrollOpacity'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Blueprint', href: '#blueprint' },
  { label: 'FAQ', href: '#faq' },
]

function UserMenu({ onAction }: { onAction?: () => void }) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    onAction?.()

    try {
      await logout()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!user) return null

  const displayName = user.displayName || user.email || 'Account'
  const photoUrl = user.photoURL

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="h-8 w-8 rounded-full border border-white/10 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden max-w-[140px] truncate text-sm text-foreground lg:inline">
          {displayName}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="gap-2"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
      </Button>
    </div>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrollOpacity = useScrollOpacity(80)
  const location = useLocation()
  const { user, loading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isLanding = location.pathname === '/'

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    if (!isLanding) return
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: theme === 'light'
          ? `rgba(250, 245, 248, ${scrollOpacity * 0.85})`
          : `rgba(5, 5, 5, ${scrollOpacity * 0.85})`,
        backdropFilter: scrollOpacity > 0 ? 'blur(12px)' : 'none',
        borderBottom: scrollOpacity > 0
          ? (theme === 'light' ? '1px solid var(--border)' : '1px solid rgba(255,255,255,0.06)')
          : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />

        {isLanding && (
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(link.href)
                }}
                className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {loading ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : user ? (
            <>
              <Link to="/dashboard">
                <Button variant="primary" size="sm">
                  Go to Dashboard
                </Button>
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden p-2 text-muted hover:text-foreground cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-xl px-6 py-4">
          {isLanding &&
            navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(link.href)
                }}
                className="block py-3 text-sm text-muted hover:text-foreground cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          <div className={cn('flex flex-col gap-2', isLanding && 'mt-4 pt-4 border-t border-white/[0.06]')}>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full p-2.5 rounded-lg text-sm text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
              aria-label="Toggle theme"
            >
              <span className="font-medium">Theme</span>
              <div className="flex items-center gap-1.5 text-muted hover:text-foreground">
                <span className="text-xs capitalize">{theme}</span>
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </div>
            </button>

            {loading ? (
              <div className="h-10 w-full animate-pulse rounded-lg bg-white/[0.06]" />
            ) : user ? (
              <div className="flex flex-col gap-2 py-2">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Go to Dashboard
                  </Button>
                </Link>
                <UserMenu onAction={() => setMobileOpen(false)} />
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
