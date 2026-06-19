import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, FileText, XCircle } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { NotesHubCard, notesHubStats } from '@/components/notes/NotesHubCard'
import { NotesHubEmptyState } from '@/components/notes/NotesHubEmptyState'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useLectures } from '@/hooks/useLectures'
import { useUserNotes } from '@/hooks/useUserNotes'
import { getTranscriptLectureIds } from '@/services/transcriptionService'
import { useAuthContext } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

function StatPill({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: number
  icon: typeof FileText
  tone: 'accent' | 'emerald' | 'sky' | 'red'
}) {
  const tones = {
    accent: 'border-accent/20 bg-accent/[0.06] text-accent',
    emerald: 'border-emerald/20 bg-emerald/[0.06] text-emerald',
    sky: 'border-sky-400/20 bg-sky-400/[0.06] text-sky-400',
    red: 'border-red/20 bg-red/[0.06] text-red',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl',
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      </div>
    </div>
  )
}

export function SmartNotesPage() {
  const { user } = useAuthContext()
  const { lectures, loading: lecturesLoading } = useLectures()
  const { notes, loading: notesLoading } = useUserNotes()
  const [transcriptIds, setTranscriptIds] = useState<Set<string>>(new Set())
  const [transcriptsLoading, setTranscriptsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTranscriptIds(new Set())
      setTranscriptsLoading(false)
      return
    }

    setTranscriptsLoading(true)
    void getTranscriptLectureIds(user.uid)
      .then(setTranscriptIds)
      .catch(() => setTranscriptIds(new Set()))
      .finally(() => setTranscriptsLoading(false))
  }, [user, lectures.length])

  const notesByLecture = useMemo(
    () => new Map(notes.map((entry) => [entry.lectureId, entry])),
    [notes],
  )

  const stats = useMemo(() => notesHubStats(notes), [notes])

  const loading = lecturesLoading || notesLoading || transcriptsLoading

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Smart Notes"
          description="AI-generated notes from your lectures, recordings, and PDFs."
        />
      </FadeUp>

      {!loading && lectures.length > 0 && (
        <FadeUp delay={0.05}>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatPill label="Total notes" value={stats.total} icon={FileText} tone="accent" />
            <StatPill label="Ready" value={stats.ready} icon={CheckCircle2} tone="emerald" />
            <StatPill label="In progress" value={stats.pending} icon={Clock} tone="sky" />
            <StatPill label="Failed" value={stats.failed} icon={XCircle} tone="red" />
          </div>
        </FadeUp>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <FadeUp key={index} delay={0.05 * index}>
              <Skeleton className="h-32 w-full rounded-2xl" />
            </FadeUp>
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <NotesHubEmptyState />
      ) : (
        <div className="space-y-4">
          {lectures.map((lecture, index) => (
            <FadeUp key={lecture.id} delay={0.04 * index}>
              <NotesHubCard
                lecture={lecture}
                notes={notesByLecture.get(lecture.id) ?? null}
                hasTranscript={transcriptIds.has(lecture.id)}
              />
            </FadeUp>
          ))}

        </div>
      )}
    </DashboardPageShell>
  )
}
