import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Mic, Plus, Trash2 } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useAuthContext } from '@/context/AuthContext'
import {
  DAY_LABELS,
  getUpcomingClass,
  loadTimetable,
  saveTimetable,
  type TimetableEntry,
} from '@/lib/timetable'
import { IcsImportButton } from '@/components/timetable/IcsImportButton'
import { useI18n } from '@/context/I18nContext'
import { cn } from '@/lib/utils'

function emptyEntry(): TimetableEntry {
  return {
    id: crypto.randomUUID(),
    title: '',
    subject: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    autoRecordReminder: true,
  }
}

export function TimetablePage() {
  const { user } = useAuthContext()
  const { translate } = useI18n()
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [draft, setDraft] = useState<TimetableEntry>(emptyEntry())

  useEffect(() => {
    if (!user) return
    setEntries(loadTimetable(user.uid))
  }, [user])

  const upcoming = useMemo(() => getUpcomingClass(entries), [entries])

  const persist = (next: TimetableEntry[]) => {
    setEntries(next)
    if (user) saveTimetable(user.uid, next)
  }

  const handleAdd = () => {
    if (!draft.title.trim()) return
    persist([...entries, { ...draft, id: crypto.randomUUID() }])
    setDraft(emptyEntry())
  }

  const handleRemove = (id: string) => {
    persist(entries.filter((entry) => entry.id !== id))
  }

  const recordHref = upcoming
    ? `/dashboard/record?subject=${encodeURIComponent(upcoming.subject || upcoming.title)}`
    : '/dashboard/record'

  return (
    <DashboardPageShell className="max-w-3xl mx-auto space-y-8">
      <FadeUp>
        <DashboardPageHeader
          title={translate('timetable.title')}
          description={translate('timetable.description')}
        />
      </FadeUp>

      {upcoming && (
        <FadeUp delay={0.05}>
          <div className="rounded-2xl border border-accent/25 bg-accent/[0.08] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{translate('timetable.nextClass')}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{upcoming.title}</p>
              <p className="text-sm text-muted">
                {upcoming.startTime}–{upcoming.endTime}
                {upcoming.location ? ` · ${upcoming.location}` : ''}
              </p>
            </div>
            <Link
              to={recordHref}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background',
                'hover:bg-accent-soft transition-colors',
              )}
            >
              <Mic className="h-4 w-4" />
              {translate('timetable.recordClass')}
            </Link>
          </div>
        </FadeUp>
      )}

      <FadeUp delay={0.08}>
        <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-accent" />
              {translate('timetable.addClass')}
            </p>
            <IcsImportButton existing={entries} onImport={persist} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Class name"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-accent/30"
            />
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              placeholder="Subject"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-accent/30"
            />
            <select
              value={draft.dayOfWeek}
              onChange={(e) => setDraft({ ...draft, dayOfWeek: Number(e.target.value) })}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none cursor-pointer"
            >
              {DAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={draft.location ?? ''}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              placeholder="Room / location"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none focus:border-accent/30"
            />
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none"
            />
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background cursor-pointer hover:bg-accent-soft"
          >
            {translate('timetable.addClass')}
          </button>
        </div>
      </FadeUp>

      <FadeUp delay={0.12}>
        <div className="rounded-2xl border border-white/[0.08] bg-card/80 overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent" />
            <p className="text-sm font-medium text-foreground">{translate('timetable.weekly')}</p>
          </div>
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted">No classes added yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {entries
                .slice()
                .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                .map((entry) => (
                  <li key={entry.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      <p className="text-xs text-muted mt-1">
                        {DAY_LABELS[entry.dayOfWeek]} · {entry.startTime}–{entry.endTime}
                        {entry.subject ? ` · ${entry.subject}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(entry.id)}
                      className="text-muted hover:text-red cursor-pointer p-2"
                      aria-label="Remove class"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </FadeUp>
    </DashboardPageShell>
  )
}
