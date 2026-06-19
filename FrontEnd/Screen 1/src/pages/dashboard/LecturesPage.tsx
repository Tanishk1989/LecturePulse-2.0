import { useMemo, useState } from 'react'
import { FadeUp } from '@/components/effects/FadeUp'
import { LectureLibraryEmptyState } from '@/components/lectures/LectureLibraryEmptyState'
import { LectureLibraryToolbar } from '@/components/lectures/LectureLibraryToolbar'
import { LectureSection } from '@/components/lectures/LectureSection'
import { DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useLectures } from '@/context/LectureContext'
import { filterAndSortLectures, sortLectures } from '@/lib/lectureFilters'
import type { LectureFilter, LectureSort } from '@/types/lecture'

export function LecturesPage() {
  const { lectures, loading, deleteLecture, updateLectureTitle, toggleFavorite } = useLectures()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LectureFilter>('all')
  const [sort, setSort] = useState<LectureSort>('newest')

  const hasLectures = lectures.length > 0

  const recentLectures = useMemo(
    () => sortLectures(lectures, 'newest').slice(0, 6),
    [lectures],
  )

  const favoriteLectures = useMemo(
    () =>
      filterAndSortLectures(
        lectures.filter((lecture) => lecture.favorite),
        search,
        'all',
        sort,
      ),
    [lectures, search, sort],
  )

  const filteredLectures = useMemo(
    () => filterAndSortLectures(lectures, search, filter, sort),
    [lectures, search, filter, sort],
  )

  const showRecent = hasLectures && filter === 'all' && !search.trim()
  const showFavorites =
    hasLectures && filter === 'all' && !search.trim() && favoriteLectures.length > 0

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
      ) : !hasLectures ? (
        <FadeUp delay={0.1}>
          <LectureLibraryEmptyState />
        </FadeUp>
      ) : (
        <div className="space-y-10">
          {showRecent && (
            <FadeUp delay={0.08}>
              <LectureSection
                title="Recent Lectures"
                lectures={recentLectures}
                onDelete={(id) => void deleteLecture(id)}
                onRename={(id, title) => void updateLectureTitle(id, title)}
                onToggleFavorite={(id) => void toggleFavorite(id)}
                horizontal
              />
            </FadeUp>
          )}

          {showFavorites && (
            <FadeUp delay={0.12}>
              <LectureSection
                title="Favorites"
                icon="star"
                lectures={favoriteLectures}
                onDelete={(id) => void deleteLecture(id)}
                onRename={(id, title) => void updateLectureTitle(id, title)}
                onToggleFavorite={(id) => void toggleFavorite(id)}
                horizontal
              />
            </FadeUp>
          )}

          <FadeUp delay={0.16}>
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
