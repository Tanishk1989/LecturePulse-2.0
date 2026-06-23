import { Search, SlidersHorizontal, Star } from 'lucide-react'
import type { LectureFilter, LectureSort } from '@/types/lecture'
import {
  dashboardPageDescriptionClass,
  dashboardPageTitleClass,
} from '@/components/dashboard/ui/DashboardPageShell'
import { cn } from '@/lib/utils'

interface LectureLibraryToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  filter: LectureFilter
  onFilterChange: (value: LectureFilter) => void
  sort: LectureSort
  onSortChange: (value: LectureSort) => void
}

export function LectureLibraryToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: LectureLibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="text-left">
        <h1 className={dashboardPageTitleClass}>My Lectures</h1>
        <p className={dashboardPageDescriptionClass}>
          All your recordings, uploads and study sessions in one place.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 xl:max-w-xl">
        {/* Search bar + Favorites toggle next to it */}
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search lectures..."
              className={cn(
                'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-foreground',
                'placeholder:text-muted/70 outline-none backdrop-blur-xl transition-all duration-300',
                'focus:border-accent/40 focus:bg-white/[0.04] focus:shadow-[0_0_24px_rgba(180,230,29,0.1)]',
              )}
            />
          </div>
          <button
            type="button"
            onClick={() => onFilterChange(filter === 'favorites' ? 'all' : 'favorites')}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 cursor-pointer',
              filter === 'favorites'
                ? 'border-accent/35 bg-accent/[0.1] text-accent'
                : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.14] hover:text-foreground'
            )}
            title="Filter by Favorites"
          >
            <Star className="h-4 w-4" fill={filter === 'favorites' ? 'currentColor' : 'none'} strokeWidth={1.75} />
          </button>
        </div>

        {/* Dropdowns for Type Filtering & Sorting */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filter Dropdown */}
          <label className="relative flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted" />
            <span className="text-xs text-muted">Type:</span>
            <div className="relative">
              <select
                value={filter === 'favorites' ? 'all' : filter}
                onChange={(event) => onFilterChange(event.target.value as LectureFilter)}
                className={cn(
                  'appearance-none rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-3 pr-8 text-xs font-medium text-foreground',
                  'outline-none backdrop-blur-xl transition-all duration-300 cursor-pointer',
                  'focus:border-accent/35 focus:shadow-[0_0_20px_rgba(180,230,29,0.1)]',
                )}
              >
                <option value="all" className="bg-card">All types</option>
                <option value="audio" className="bg-card">Audio</option>
                <option value="video" className="bg-card">Video</option>
                <option value="pdf" className="bg-card">PDF</option>
                <option value="recorded" className="bg-card">Recorded</option>
                <option value="uploaded" className="bg-card">Uploaded</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-l-[3.5px] border-r-[3.5px] border-t-[4px] border-l-transparent border-r-transparent border-t-muted" />
            </div>
          </label>

          {/* Sort Dropdown */}
          <label className="relative flex items-center gap-2">
            <span className="text-xs text-muted">Sort:</span>
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => onSortChange(event.target.value as LectureSort)}
                className={cn(
                  'appearance-none rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pl-3 pr-8 text-xs font-medium text-foreground',
                  'outline-none backdrop-blur-xl transition-all duration-300 cursor-pointer',
                  'focus:border-accent/35 focus:shadow-[0_0_20px_rgba(180,230,29,0.1)]',
                )}
              >
                <option value="newest" className="bg-card">Newest first</option>
                <option value="oldest" className="bg-card">Oldest first</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border-l-[3.5px] border-r-[3.5px] border-t-[4px] border-l-transparent border-r-transparent border-t-muted" />
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
