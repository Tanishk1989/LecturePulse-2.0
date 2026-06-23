import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Layers, Loader2, Sparkles, Upload } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'
import { useToast } from '@/components/ui/ToastProvider'
import { useAuthContext } from '@/context/AuthContext'
import { useLectures } from '@/hooks/useLectures'
import {
  AI_UNAVAILABLE_MESSAGE,
  generateCombinedSummaryStream,
  generateSummaryStream,
  isAiGenerationConfigured,
} from '@/services/aiGenerationService'
import { buildTutorContext } from '@/services/aiTutorService'
import { getTranscriptByLectureId, getTranscriptLectureIds } from '@/services/transcriptionService'
import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer'
import { FeedbackControls } from '@/components/shared/FeedbackControls'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'

export function SummaryPage() {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const { lectures, loading: lecturesLoading } = useLectures()
  const [transcriptIds, setTranscriptIds] = useState<Set<string>>(new Set())
  const [transcriptsLoading, setTranscriptsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('all')
  const [summary, setSummary] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

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

  const readyLectures = useMemo(
    () => lectures.filter((lecture) => transcriptIds.has(lecture.id)),
    [lectures, transcriptIds],
  )

  const selectedLecture = useMemo(
    () => readyLectures.find((lecture) => lecture.id === selectedId),
    [readyLectures, selectedId],
  )

  const loading = lecturesLoading || transcriptsLoading
  const aiConfigured = isAiGenerationConfigured()

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setSummary(null)
  }

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Sign in to generate summaries.')
      return
    }

    if (!aiConfigured) {
      toast.error(AI_UNAVAILABLE_MESSAGE)
      return
    }

    if (readyLectures.length === 0) {
      toast.error('Add a lecture and wait for processing to finish first.')
      return
    }

    setGenerating(true)
    setSummary(null)

    try {
      let accumulated = ''
      if (selectedId === 'all') {
        const context = await buildTutorContext(user.uid, readyLectures)
        if (!context.trim()) {
          toast.error('No lecture content found yet.')
          setGenerating(false)
          return
        }
        await generateCombinedSummaryStream(context, (chunk) => {
          accumulated += chunk
          setSummary(accumulated)
        })
      } else {
        const transcript = await getTranscriptByLectureId(user.uid, selectedId)
        const text = transcript?.fullText ?? transcript?.text ?? ''
        if (!text.trim()) {
          toast.error('This lecture is still processing.')
          setGenerating(false)
          return
        }
        await generateSummaryStream(text, {
          lectureTitle: selectedLecture?.title,
        }, (chunk) => {
          accumulated += chunk
          setSummary(accumulated)
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Summary generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Summary"
          description="Your dedicated summary workspace — pick a lecture on the left, then ask AI to summarize it."
        />
      </FadeUp>

      {loading ? (
        <FadeUp delay={0.08}>
          <Skeleton className="min-h-[560px] w-full rounded-2xl" />
        </FadeUp>
      ) : readyLectures.length === 0 ? (
        <FadeUp delay={0.08}>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card/60 px-6 py-20 text-center backdrop-blur-xl min-h-[420px] flex flex-col items-center justify-center">
            <AmbientPageBackground variant="gold" className="rounded-2xl" />
            <div className="relative max-w-md">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08]">
                <FileText className="h-8 w-8 text-accent" strokeWidth={1.5} />
              </div>
              <p className="text-xl font-semibold text-foreground">Summary page</p>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                Upload or record a lecture first. When processing finishes, return here to generate
                AI summaries on demand.
              </p>
              <Link
                to="/dashboard/upload"
                className={cn(
                  'mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                  'hover:bg-accent-soft transition-all cursor-pointer',
                )}
              >
                <Upload className="h-4 w-4" />
                Add a lecture
              </Link>
            </div>
          </div>
        </FadeUp>
      ) : (
        <FadeUp delay={0.1}>
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border border-accent/15',
              'bg-card/80 backdrop-blur-xl min-h-[560px] lg:min-h-[620px]',
            )}
          >
            <AmbientPageBackground variant="gold" className="rounded-2xl" />
            <div className="absolute inset-0 glass-card opacity-20 pointer-events-none rounded-2xl" />

            <div className="relative z-10 grid min-h-[560px] lg:min-h-[620px] lg:grid-cols-[300px_minmax(0,1fr)]">
              {/* Left: lecture picker */}
              <aside className="border-b lg:border-b-0 lg:border-r border-white/[0.06] p-4 md:p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Your lectures
                </p>

                <button
                  type="button"
                  onClick={() => handleSelect('all')}
                  className={cn(
                    'mb-2 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all cursor-pointer',
                    selectedId === 'all'
                      ? 'border-accent/30 bg-accent/[0.1] text-accent'
                      : 'border-white/[0.08] bg-white/[0.02] text-muted hover:text-foreground hover:border-white/[0.14]',
                  )}
                >
                  <Layers className="h-4 w-4 shrink-0" />
                  <span className="font-medium">All lectures</span>
                  <span className="ml-auto text-xs opacity-70">{readyLectures.length}</span>
                </button>

                <ScrollFadeContainer
                  fadeColor="var(--card)"
                  className="max-h-[420px] pr-1"
                >
                  <ul className="space-y-1">
                    {readyLectures.map((lecture) => (
                      <li key={lecture.id}>
                        <button
                          type="button"
                          onClick={() => handleSelect(lecture.id)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition-all cursor-pointer',
                            selectedId === lecture.id
                              ? 'border-accent/30 bg-accent/[0.1] text-foreground'
                              : 'border-transparent bg-transparent text-muted hover:bg-white/[0.03] hover:text-foreground',
                          )}
                        >
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent/80" />
                          <span className="line-clamp-2 font-medium leading-snug">{lecture.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </ScrollFadeContainer>
              </aside>

              {/* Right: summary workspace */}
              <main className="flex min-h-0 flex-col p-5 md:p-8">
                <div className="mb-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                      AI Summary
                    </p>
                    <h2 className="mt-1 font-heading text-2xl text-foreground md:text-3xl">
                      {selectedId === 'all'
                        ? 'All lectures'
                        : selectedLecture?.title ?? 'Select a lecture'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {selectedId === 'all'
                        ? 'Combined overview across your library'
                        : 'Summary for this lecture only'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={generating || !aiConfigured}
                    className={cn(
                      'inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3',
                      'text-sm font-medium text-background shadow-[0_0_24px_rgba(214,162,11,0.2)]',
                      'hover:bg-accent-soft transition-all cursor-pointer disabled:opacity-40',
                    )}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {generating ? 'Generating…' : 'Generate summary'}
                  </button>
                </div>

                <ScrollFadeContainer
                  fadeColor="var(--card)"
                  className="min-h-0 flex-1 rounded-2xl border border-white/[0.06] bg-black/20 p-5 md:p-6 relative group"
                >
                  {generating && !summary && (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                      <Loader2 className="h-9 w-9 animate-spin text-accent" />
                      <p className="text-sm text-muted">AI is reading your lecture and writing a summary…</p>
                    </div>
                  )}

                  {!generating && !summary && (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
                      <Sparkles className="h-10 w-10 text-accent/50" strokeWidth={1.5} />
                      <p className="max-w-sm text-sm text-muted leading-relaxed">
                        Select a lecture from the list, then click{' '}
                        <span className="text-foreground">Generate summary</span> to get an
                        AI-written overview.
                      </p>
                    </div>
                  )}

                  {summary && (
                    <div className="space-y-4">
                      <MarkdownRenderer content={summary} showCursor={generating} />
                      {!generating && (
                        <div className="flex justify-end">
                          <FeedbackControls
                            contentType="summary"
                            contentId="summary"
                            lectureId={selectedId}
                            subject={selectedId === 'all' ? null : selectedLecture?.subject}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </ScrollFadeContainer>
              </main>
            </div>
          </div>
        </FadeUp>
      )}
    </DashboardPageShell>
  )
}
