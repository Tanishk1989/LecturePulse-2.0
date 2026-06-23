
import { useState } from 'react'
import { Bell, Menu, Search, Sun, Moon, ArrowLeft } from 'lucide-react'
import { AccountDropdown } from '@/components/account/AccountDropdown'
import { PulseIcon } from '@/components/shared/PulseIcon'
import { useDashboard } from '@/context/DashboardContext'
import { useTheme } from '@/context/ThemeContext'
import { searchExamples } from '@/config/dashboardNav'
import { isXlUp } from '@/lib/breakpoints'
import { cn } from '@/lib/utils'

export function TopNavbar() {
  const { toggleSidebar, openTutor } = useDashboard()
  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchValue.trim()
    if (query) {
      openTutor(query)
      setSearchValue('')
    } else {
      openTutor()
    }
    setSearchFocused(false)
    setMobileSearchOpen(false)
  }

  const handleSearchFocus = () => {
    if (isXlUp()) {
      openTutor(searchValue.trim() || undefined)
      setSearchFocused(false)
      return
    }
    setSearchFocused(true)
  }

  if (mobileSearchOpen) {
    return (
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 w-full">
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer border-0 bg-transparent"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <div
              className={cn(
                'relative flex items-center rounded-xl border bg-white/[0.02] transition-all duration-300 border-accent/25 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.08)]'
              )}
            >
              <Search className="absolute left-3.5 h-4 w-4 text-muted" />
              <input
                type="text"
                autoFocus
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Ask anything..."
                className="h-10 w-full bg-transparent pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none cursor-text"
              />
            </div>
          </form>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-5 lg:px-8">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer border-0 bg-transparent"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Mobile branding logo */}
          <div className="flex items-center gap-2 sm:hidden shrink-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/25 bg-accent/[0.06]"
              style={{ boxShadow: '0 0 16px rgba(var(--color-accent-rgb),0.12)' }}
            >
              <PulseIcon size={18} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="hidden sm:block flex-1 sm:max-w-xs md:max-w-md lg:max-w-2xl mx-auto">
          <div
            className={cn(
              'relative flex items-center rounded-xl border bg-white/[0.02] transition-all duration-300',
              searchFocused ? 'border-accent/25 shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.08)]' : 'border-white/[0.08]',
            )}
          >
            <Search className="absolute left-3.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={() => setSearchFocused(false)}
              placeholder="Ask anything..."
              className="h-10 w-full bg-transparent pl-10 pr-20 text-sm text-foreground placeholder:text-muted focus:outline-none cursor-text"
            />
            <kbd className="absolute right-3 hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted font-medium">
              ⌘ K
            </kbd>
          </div>
          {searchFocused && !isXlUp() && (
            <div className="absolute mt-2 w-full rounded-xl border border-white/[0.08] bg-card p-3 shadow-xl z-50">
              <p className="text-[10px] font-semibold tracking-wider uppercase text-muted mb-2">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {searchExamples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchValue(example)
                      openTutor(example)
                      setSearchFocused(false)
                    }}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-muted hover:text-accent hover:border-accent/25 transition-all duration-300 cursor-pointer"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer flex items-center justify-center shrink-0 border-0 bg-transparent"
            aria-label="Open search"
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          <button
            onClick={toggleTheme}
            className="hidden sm:flex p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer items-center justify-center shrink-0 border-0 bg-transparent"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            className="relative p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer border-0 bg-transparent"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red" />
          </button>

          <AccountDropdown />
        </div>
      </div>
    </header>
  )
}