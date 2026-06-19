import { Search, SlidersHorizontal } from 'lucide-react'
import {
  LECTURE_FILTER_OPTIONS,
  LECTURE_SORT_OPTIONS,
} from '@/lib/lectureFilters'
import type { LectureFilter, LectureSort } from '@/types/lecture'
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
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="font-heading text-5xl md:text-6xl text-foreground">My Lectures</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted leading-relaxed">
          All your recordings, uploads and study sessions in one place.
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 xl:max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search lectures..."
            className={cn(
              'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-foreground',
              'placeholder:text-muted/70 outline-none backdrop-blur-xl transition-all duration-300',
              'focus:border-accent/40 focus:bg-white/[0.04] focus:shadow-[0_0_24px_rgba(214,162,11,0.1)]',
            )}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {LECTURE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 cursor-pointer',
                  filter === option.value
                    ? 'border-accent/35 bg-accent/[0.1] text-accent shadow-[0_0_20px_rgba(214,162,11,0.12)]'
                    : 'border-white/[0.08] bg-white/[0.03] text-muted hover:border-white/[0.14] hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="relative flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted" />
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as LectureSort)}
              className={cn(
                'appearance-none rounded-full border border-white/[0.08] bg-white/[0.03] py-2 pl-3 pr-8 text-xs font-medium text-foreground',
                'outline-none backdrop-blur-xl transition-all duration-300 cursor-pointer',
                'focus:border-accent/35 focus:shadow-[0_0_20px_rgba(214,162,11,0.1)]',
              )}
            >
              {LECTURE_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-card">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
