import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Mic, Upload, Activity as ActivityIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import { useLectures } from '@/context/LectureContext'
import { useStudyMetrics } from '@/hooks/useStudyMetrics'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { getFileTypeLabel, getLectureMediaKind } from '@/lib/lectureFilters'
import { getLectureStatusLabel, getLectureStatusStyles } from '@/lib/lectureStatus'
import { formatFileSize } from '@/lib/uploadUtils'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

function LectureRowIcon({ lecture }: { lecture: LectureRecording }) {
  const kind = getLectureMediaKind(lecture)
  if (lecture.source === 'record') {
    return <Mic className="h-4 w-4 shrink-0 text-red" strokeWidth={1.75} />
  }
  if (kind === 'pdf') {
    return <FileText className="h-4 w-4 shrink-0 text-emerald" strokeWidth={1.75} />
  }
  return <Upload className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
}

export function RecentLecturesSection() {
  const { lectures } = useLectures()
  const { activity } = useStudyMetrics()
  const [activeTab, setActiveTab] = useState<'lectures' | 'activity'>('lectures')

  const recentLectures = lectures.slice(0, 4)
  const recentActivity = activity.slice(0, 4)

  const hasLectures = recentLectures.length > 0
  const hasActivity = recentActivity.length > 0

  return (
    <FadeUp delay={0.25}>
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/90 backdrop-blur-xl p-5 md:p-6 min-h-[300px] flex flex-col">
        {/* Tab switcher header */}
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('lectures')}
              className={cn(
                'text-xs font-semibold tracking-wider uppercase pb-2 border-b-2 transition-all cursor-pointer',
                activeTab === 'lectures'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Recent Lectures
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={cn(
                'text-xs font-semibold tracking-wider uppercase pb-2 border-b-2 transition-all cursor-pointer',
                activeTab === 'activity'
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted hover:text-foreground'
              )}
            >
              Recent Activity
            </button>
          </div>

          {activeTab === 'lectures' && hasLectures && (
            <Link
              to="/dashboard/lectures"
              className="text-xs font-medium text-accent hover:text-accent-soft transition-colors cursor-pointer"
            >
              View all
            </Link>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          {activeTab === 'lectures' ? (
            !hasLectures ? (
              <div className="text-center py-8 text-sm text-muted">
                No lectures yet. Start recording or upload a file.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06] min-h-0 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {recentLectures.map((lecture) => {
                    const status = getLectureStatusStyles(lecture)
                    const kind = getLectureMediaKind(lecture)

                    return (
                      <motion.div
                        key={lecture.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/dashboard/transcript/${lecture.id}`}
                            className="flex items-center gap-2 hover:text-accent transition-colors"
                          >
                            <LectureRowIcon lecture={lecture} />
                             <p className="truncate text-sm font-semibold text-foreground">
                              {lecture.status === 'processing' || lecture.status === 'uploaded' ? (
                                <span className="text-muted/60 italic animate-pulse">Generating title...</span>
                              ) : (
                                lecture.title
                              )}
                            </p>
                          </Link>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                            <span>{formatRelativeDate(lecture.createdAt)}</span>
                            <span className="text-white/20">·</span>
                            <span className="font-mono tabular-nums">
                              {kind === 'pdf' && lecture.fileSize
                                ? formatFileSize(lecture.fileSize)
                                : lecture.duration != null && lecture.duration > 0
                                  ? formatDuration(lecture.duration)
                                  : '—'}
                            </span>
                            <span className="text-white/20">·</span>
                            <span>{getFileTypeLabel(lecture)}</span>
                          </div>
                        </div>

                        {/* Status tag */}
                        <div className="shrink-0">
                          {lecture.status === 'processing' || lecture.status === 'failed' ? (
                            <div
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5',
                                status.container
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                              <span className="text-[10px] font-medium">
                                {getLectureStatusLabel(lecture)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted font-medium pr-1">
                              {getLectureStatusLabel(lecture)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )
          ) : !hasActivity ? (
            <div className="text-center py-8 text-sm text-muted">
              No activity logged yet. Start studying to build a streak!
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] min-h-0 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {recentActivity.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={item.href}
                        className="flex items-center gap-2 hover:text-accent transition-colors"
                      >
                        <ActivityIcon className="h-4 w-4 text-accent shrink-0" strokeWidth={1.75} />
                        <p className="text-sm font-semibold text-foreground truncate">
                          {item.title}
                        </p>
                      </Link>
                      <p className="text-xs text-muted truncate mt-1">
                        {item.subtitle}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-muted">
                        {formatRelativeDate(item.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </FadeUp>
  )
}
