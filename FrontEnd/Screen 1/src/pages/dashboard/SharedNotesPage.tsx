import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, BookOpen, Loader2 } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { useAuthContext } from '@/context/AuthContext'
import { useLectures } from '@/hooks/useLectures'
import { useToast } from '@/components/ui/ToastProvider'
import { fetchSharedNotes, mergeSharedNotes } from '@/services/shareService'
import type { StructuredNotesContent } from '@/types/notes'
import { cn } from '@/lib/utils'

export function SharedNotesPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { lectures } = useLectures()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lectureTitle, setLectureTitle] = useState('')
  const [content, setContent] = useState<StructuredNotesContent | null>(null)
  const [allowMerge, setAllowMerge] = useState(false)
  const [targetLectureId, setTargetLectureId] = useState('')

  const completedLectures = useMemo(
    () => lectures.filter((lecture) => lecture.status === 'completed'),
    [lectures],
  )

  useEffect(() => {
    if (!token) return
    void fetchSharedNotes(token)
      .then((data) => {
        setLectureTitle(data.lectureTitle)
        setContent(data.content)
        setAllowMerge(data.allowMerge)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shared notes.')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleMerge = async () => {
    if (!token || !targetLectureId || !user) {
      toast.error('Sign in and choose a lecture to merge into.')
      return
    }

    setMerging(true)
    try {
      const result = await mergeSharedNotes(token, targetLectureId)
      toast.success(`Merged ${result.mergedCount} items into your notes.`)
      navigate(`/notes/${targetLectureId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Merge failed.')
    } finally {
      setMerging(false)
    }
  }

  return (
    <DashboardPageShell className="max-w-3xl mx-auto">
      <FadeUp>
        <DashboardPageHeader
          title="Shared Notes"
          description="Collaborative lecture notes shared with you."
        />
      </FadeUp>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          Loading shared notes…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red/20 bg-red/[0.06] p-6 text-sm text-red-200">
          {error}
        </div>
      ) : content ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-card/80 p-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{lectureTitle}</h2>
                {content.summary && (
                  <p className="mt-3 text-sm text-foreground/85 leading-relaxed">{content.summary}</p>
                )}
              </div>
            </div>

            {content.keyConcepts?.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Key concepts</p>
                <ul className="space-y-2">
                  {content.keyConcepts.slice(0, 6).map((concept) => (
                    <li key={concept.title} className="text-sm text-foreground/85">
                      <span className="font-medium">{concept.title}</span> — {concept.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {allowMerge && user && (
            <div className="rounded-2xl border border-accent/20 bg-accent/[0.06] p-6 space-y-4">
              <p className="text-sm font-medium text-foreground">Merge into your notes</p>
              <select
                value={targetLectureId}
                onChange={(event) => setTargetLectureId(event.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground outline-none cursor-pointer"
              >
                <option value="">Select your lecture…</option>
                {completedLectures.map((lecture) => (
                  <option key={lecture.id} value={lecture.id}>
                    {lecture.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!targetLectureId || merging}
                onClick={() => void handleMerge()}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background',
                  'cursor-pointer hover:bg-accent-soft disabled:opacity-50',
                )}
              >
                {merging ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Merge shared notes
              </button>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted">
              <a href="/login" className="text-accent hover:underline">Sign in</a> to merge these notes into your library.
            </p>
          )}
        </div>
      ) : null}
    </DashboardPageShell>
  )
}
