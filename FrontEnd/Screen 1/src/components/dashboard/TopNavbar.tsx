import { useState } from 'react'
import { Bell, Menu, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/context/DashboardContext'
import { searchExamples } from '@/config/dashboardNav'
import { cn } from '@/lib/utils'

export function TopNavbar() {
  const { user } = useAuth()
  const { toggleSidebar, openTutor } = useDashboard()
  const [searchValue, setSearchValue] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const displayName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Student'
  const photoUrl = user?.photoURL

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    openTutor(searchValue.trim())
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-5 lg:px-8">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-2xl mx-auto">
          <div
            className={cn(
              'relative flex items-center rounded-xl border bg-white/[0.02] transition-all duration-300',
              searchFocused ? 'border-accent/25 shadow-[0_0_20px_rgba(214,162,11,0.08)]' : 'border-white/[0.08]',
            )}
          >
            <Search className="absolute left-3.5 h-4 w-4 text-muted" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Ask anything..."
              className="h-10 w-full bg-transparent pl-10 pr-20 text-sm text-foreground placeholder:text-muted focus:outline-none cursor-text"
            />
            <kbd className="absolute right-3 hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted font-medium">
              ⌘ K
            </kbd>
          </div>
          {searchFocused && (
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

        <div className="flex items-center gap-3 shrink-0">
          <button
            className="relative p-2 rounded-lg text-muted hover:text-foreground hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red" />
          </button>

          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              className="h-8 w-8 rounded-full border border-white/10 object-cover cursor-pointer"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-xs font-semibold text-accent cursor-pointer">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <span className="hidden md:inline text-sm text-muted">
            Hello, <span className="text-foreground font-medium">{displayName}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
