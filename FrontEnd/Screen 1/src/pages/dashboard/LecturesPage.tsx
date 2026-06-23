import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { LectureLibraryEmptyState } from '@/components/lectures/LectureLibraryEmptyState'
import { LectureLibraryToolbar } from '@/components/lectures/LectureLibraryToolbar'
import { LectureSection } from '@/components/lectures/LectureSection'
import { DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useLectures } from '@/context/LectureContext'
import { filterAndSortLectures } from '@/lib/lectureFilters'
import { cn } from '@/lib/utils'
import type { LectureFilter, LectureSort } from '@/types/lecture'

export function LecturesPage() {
  const { lectures, loading, error, refresh, deleteLecture, updateLectureTitle, toggleFavorite } =
    useLectures()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LectureFilter>('all')
  const [sort, setSort] = useState<LectureSort>('newest')

  const hasLectures = lectures.length > 0

  const filteredLectures = useMemo(
    () => filterAndSortLectures(lectures, search, filter, sort),
    [lectures, search, filter, sort],
  )

  return (
    <DashboardPageShell className="space-y-8">
      <FadeUp>
        <LectureLibraryToolbar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
        />
      </FadeUp>

      {loading ? (
        <FadeUp delay={0.1}>
          <div className="rounded-3xl border border-white/[0.08] bg-card/50 py-16 text-center backdrop-blur-xl">
            <p className="text-sm text-muted">Loading your lectures…</p>
          </div>
        </FadeUp>
      ) : error && !hasLectures ? (
        <FadeUp delay={0.1}>
          <div className="rounded-3xl border border-red/20 bg-red/[0.04] px-6 py-14 text-center backdrop-blur-xl">
            <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red" strokeWidth={1.5} />
            <p className="text-base font-medium text-foreground">Couldn&apos;t load lectures</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className={cn(
                'mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-5 py-2.5',
                'text-sm font-medium text-foreground hover:border-accent/25 hover:bg-accent/[0.06]',
                'transition-all cursor-pointer',
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </FadeUp>
      ) : !hasLectures ? (
        <FadeUp delay={0.1}>
          <LectureLibraryEmptyState />
        </FadeUp>
      ) : (
        <div className="space-y-10">
          <FadeUp delay={0.12}>
            <LectureSection
              title={filter === 'favorites' ? 'Favorites' : 'All Lectures'}
              icon={filter === 'favorites' ? 'star' : undefined}
              lectures={filteredLectures}
              onDelete={(id) => void deleteLecture(id)}
              onRename={(id, title) => void updateLectureTitle(id, title)}
              onToggleFavorite={(id) => void toggleFavorite(id)}
            />
          </FadeUp>

          {filteredLectures.length === 0 && (
            <div className="rounded-3xl border border-white/[0.08] bg-card/50 py-16 text-center backdrop-blur-xl">
              <p className="text-base font-medium text-foreground">No lectures match your filters.</p>
              <p className="mt-2 text-sm text-muted">Try a different search or filter.</p>
            </div>
          )}
        </div>
      )}
    </DashboardPageShell>
  )
}
