import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, X } from 'lucide-react'
import { useAuthContext } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { getUpcomingClass, loadTimetable } from '@/lib/timetable'
import { cn } from '@/lib/utils'

function isClassStartingNow(startTime: string, now = new Date()): boolean {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= startMinutes && currentMinutes <= startMinutes + 10
}

export function ClassStartingPrompt() {
  const { user } = useAuthContext()
  const { translate } = useI18n()
  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const activeClass = useMemo(() => {
    if (!user) return null
    const entries = loadTimetable(user.uid).filter((entry) => entry.autoRecordReminder)
    const today = entries.filter((entry) => entry.dayOfWeek === now.getDay())
    return today.find((entry) => isClassStartingNow(entry.startTime, now)) ?? null
  }, [now, user])

  if (!activeClass || dismissedId === activeClass.id) return null

  const recordHref = `/dashboard/record?subject=${encodeURIComponent(activeClass.subject || activeClass.title)}&autostart=1`

  return (
    <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto w-full max-w-lg rounded-2xl border border-accent/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md',
          'animate-in fade-in slide-in-from-top-2',
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Mic className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {translate('timetable.classStarting')}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{activeClass.title}</p>
            <p className="text-xs text-muted mt-0.5">
              {activeClass.startTime}–{activeClass.endTime}
              {activeClass.location ? ` · ${activeClass.location}` : ''}
            </p>
            <Link
              to={recordHref}
              className={cn(
                'mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-background',
                'hover:bg-accent-soft transition-colors',
              )}
            >
              <Mic className="h-3.5 w-3.5" />
              {translate('timetable.startRecording')}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setDismissedId(activeClass.id)}
            className="text-muted hover:text-foreground cursor-pointer p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
