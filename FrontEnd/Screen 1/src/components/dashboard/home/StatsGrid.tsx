import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Clock, FilePlus, FolderOpen, Layers } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { useAuthContext } from '@/context/AuthContext'
import { useLectures } from '@/context/LectureContext'
import { getFlashcardCount } from '@/services/flashcardService'
import { getNotesCount } from '@/services/notesService'
import { formatStudyMinutes } from '@/lib/studyMetrics'
import { cn } from '@/lib/utils'

type StatEntry = {
  id: string
  title: string
  value: string
  subtitle: string
  href: string
  icon: LucideIcon
  iconBox: string
  iconGlow: string
  showView?: boolean
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
  iconBox,
  iconGlow,
  showView = true,
}: Omit<StatEntry, 'id'>) {
  return (
    <div
      className={cn(
        'group relative flex min-h-[148px] flex-col overflow-hidden rounded-2xl border border-white/[0.08]',
        'bg-[#0D0D0D]/90 backdrop-blur-xl p-5',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14]',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground/90">{title}</p>

        <div className="relative shrink-0">
          <div
            className={cn(
              'absolute -inset-2 rounded-xl blur-xl opacity-50 pointer-events-none',
              iconGlow,
            )}
            aria-hidden
          />
          <div
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-xl border backdrop-blur-md',
              'transition-transform duration-300 group-hover:scale-105',
              iconBox,
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      <p className="mt-3 font-heading text-3xl text-foreground leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted">{subtitle}</p>

      {showView && (
        <Link
          to={href}
          className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-medium text-accent transition-colors duration-300 hover:text-accent-soft cursor-pointer group/link"
        >
          View
          <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/link:translate-x-0.5" />
        </Link>
      )}
    </div>
  )
}

interface StatsGridProps {
  studyTimeMinutes?: number
}

export function StatsGrid({ studyTimeMinutes = 0 }: StatsGridProps) {
  const { user } = useAuthContext()
  const { lectures } = useLectures()
  const [flashcardCount, setFlashcardCount] = useState(0)
  const [notesCount, setNotesCount] = useState(0)
  const lectureCount = lectures.length

  useEffect(() => {
    if (!user) {
      setFlashcardCount(0)
      setNotesCount(0)
      return
    }

    void getFlashcardCount(user.uid)
      .then(setFlashcardCount)
      .catch(() => setFlashcardCount(0))

    void getNotesCount(user.uid)
      .then(setNotesCount)
      .catch(() => setNotesCount(0))
  }, [user, lectures.length])

  const stats: StatEntry[] = [
    {
      id: 'lectures',
      title: 'Total Lectures',
      value: String(lectureCount),
      subtitle: lectureCount === 0 ? 'No lectures yet' : `${lectureCount} in your library`,
      href: '/dashboard/lectures',
      icon: FolderOpen,
      iconBox: 'border-accent/20 bg-accent/10 text-accent',
      iconGlow: 'bg-accent/25',
    },
    {
      id: 'notes',
      title: 'Notes Created',
      value: String(notesCount),
      subtitle: notesCount === 0 ? 'Start taking smart notes' : `${notesCount} ready in your library`,
      href: '/dashboard/notes',
      icon: FilePlus,
      iconBox: 'border-ambient/20 bg-ambient/10 text-ambient',
      iconGlow: 'bg-ambient/25',
    },
    {
      id: 'flashcards',
      title: 'Flashcards',
      value: String(flashcardCount),
      subtitle: flashcardCount === 0 ? 'No flashcards yet' : `${flashcardCount} in your deck`,
      href: '/dashboard/flashcards',
      icon: Layers,
      iconBox: 'border-emerald/20 bg-emerald/10 text-emerald',
      iconGlow: 'bg-emerald/25',
    },
    {
      id: 'study-time',
      title: 'Study Time',
      value: formatStudyMinutes(studyTimeMinutes),
      subtitle: studyTimeMinutes > 0 ? 'Logged today' : 'Start a review session',
      href: '/dashboard/revision',
      icon: Clock,
      iconBox: 'border-sky-400/20 bg-sky-400/10 text-sky-400',
      iconGlow: 'bg-sky-400/25',
      showView: false,
    },
  ]

  return (
    <FadeUp delay={0.24}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>
    </FadeUp>
  )
}
