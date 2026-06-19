import { useCallback, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import {
  TranscriptAudioEngine,
  type TranscriptAudioEngineHandle,
} from '@/components/transcript/TranscriptAudioEngine'
import { TranscriptAIPanel } from '@/components/transcript/TranscriptAIPanel'
import { TranscriptEmptyState } from '@/components/transcript/TranscriptEmptyState'
import { TranscriptLoadingState } from '@/components/transcript/TranscriptLoadingState'
import { TranscriptSearchBar } from '@/components/transcript/TranscriptSearchBar'
import { TranscriptSegmentList } from '@/components/transcript/TranscriptSegmentList'
import {
  TranscriptSelectionMenu,
  type SelectionAction,
} from '@/components/transcript/TranscriptSelectionMenu'
import { TranscriptSidebar } from '@/components/transcript/TranscriptSidebar'
import { TranscriptWaveformPreview } from '@/components/transcript/TranscriptWaveformPreview'
import { TranscriptionProgressCard } from '@/components/transcript/TranscriptionProgressCard'
import { useLectures } from '@/hooks/useLectures'
import { useTextSelectionMenu } from '@/hooks/useTextSelectionMenu'
import { useTranscription } from '@/hooks/useTranscription'
import { useTranscriptSearch } from '@/hooks/useTranscriptSearch'
import { getLectureMediaKind } from '@/lib/lectureFilters'
import { cn } from '@/lib/utils'

const SELECTION_PROMPTS: Record<SelectionAction, string> = {
  explain: 'Explain:',
  summarize: 'Summarize:',
  flashcards: 'Generate flashcards for:',
  notes: 'Add to notes:',
  'ask-ai': 'Ask about:',
}

export function TranscriptPage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const { lectures, loading: lecturesLoading, refresh: refreshLectures } = useLectures()

  const playerRef = useRef<TranscriptAudioEngineHandle>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [aiDraft, setAiDraft] = useState('')

  const lecture = useMemo(
    () => lectures.find((item) => item.id === lectureId),
    [lectureId, lectures],
  )

  const mediaKind = lecture ? getLectureMediaKind(lecture) : null
  const isYouTubeLecture = lecture?.source === 'youtube'
  const isTranscribable =
    mediaKind === 'audio' || mediaKind === 'video' || isYouTubeLecture

  const {
    transcript,
    phase,
    isLoading,
    isTranscribing,
    transcriptionProgress,
    overallProgress,
    interimText,
    error,
    canTranscribe,
    startTranscription,
    retryTranscription,
  } = useTranscription(lectureId, lecture?.audioUrl, {
    autoTranscribe: isTranscribable,
    onLectureStatusChange: () => void refreshLectures(),
  })

  const segments = transcript?.segments ?? []
  const search = useTranscriptSearch(segments)
  const { selection, clearSelection } = useTextSelectionMenu(transcriptContainerRef)

  const effectiveDuration = duration || lecture?.duration || 0

  const handleSeek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds)
    setCurrentTime(seconds)
  }, [])

  const handleSelectionAction = useCallback((action: SelectionAction, text: string) => {
    const prefix = SELECTION_PROMPTS[action]
    setAiDraft(`${prefix} "${text}"`)
  }, [])

  const handleMatchNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      const match =
        direction === 'next' ? search.goToNextMatch() : search.goToPreviousMatch()

      if (match) {
        const segment = segments[match.segmentIndex]
        if (segment) handleSeek(segment.start)
      }
    },
    [handleSeek, search, segments],
  )

  if (!lectureId) {
    return <Navigate to="/dashboard/lectures" replace />
  }

  if (!lecturesLoading && !lecture) {
    return <Navigate to="/dashboard/lectures" replace />
  }

  const showTranscript = phase === 'completed' && transcript
  const showLoading = isLoading
  const showTranscribing = isTranscribing
  const showEmpty = !showTranscript && !showLoading && !showTranscribing && phase !== 'failed'

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {lecture?.audioUrl && (
        <TranscriptAudioEngine
          ref={playerRef}
          url={lecture.audioUrl}
          onTimeUpdate={setCurrentTime}
          onPlayStateChange={setIsPlaying}
          onDurationChange={setDuration}
        />
      )}

      <FadeUp>
        <Link
          to="/dashboard/lectures"
          className={cn(
            'mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors',
            'hover:text-foreground cursor-pointer',
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to library
        </Link>
      </FadeUp>

      {!isTranscribable && lecture && mediaKind === 'pdf' && (
        <FadeUp delay={0.05}>
          <div className="rounded-3xl border border-white/[0.08] bg-[#0D0D0D] p-10 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted" />
            <p className="text-lg text-foreground">PDF files cannot be transcribed.</p>
            <p className="mt-2 text-sm text-muted">
              Upload an audio or video file to generate a transcript, or use Upload PDF for smart notes.
            </p>
          </div>
        </FadeUp>
      )}

      {isTranscribable && lecture && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
          <FadeUp delay={0.04}>
            <TranscriptSidebar
              lecture={lecture}
              transcript={transcript}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={effectiveDuration}
              onPlay={() => playerRef.current?.play()}
              onPause={() => playerRef.current?.pause()}
              onRestart={() => playerRef.current?.restart()}
              className="xl:sticky xl:top-24 xl:self-start"
            />
          </FadeUp>

          <FadeUp delay={0.08}>
            <section
              className={cn(
                'relative flex min-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-3xl',
                'border border-white/[0.08] bg-[#0D0D0D]/95 backdrop-blur-xl',
                'shadow-[0_20px_60px_rgba(0,0,0,0.4)]',
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-ambient/[0.02]" />

              <div className="relative flex min-h-0 flex-1 flex-col p-5 md:p-6">
                {showTranscript && (
                  <TranscriptSearchBar
                    query={search.query}
                    onQueryChange={search.setQuery}
                    matchCount={search.matchCount}
                    activeMatchIndex={search.activeMatchIndex}
                    onNextMatch={() => handleMatchNavigation('next')}
                    onPreviousMatch={() => handleMatchNavigation('prev')}
                    hasQuery={search.hasQuery}
                  />
                )}

                {isTranscribing ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 py-8">
                    <TranscriptionProgressCard
                      progress={overallProgress}
                      transcriptionProgress={transcriptionProgress}
                      className="w-full max-w-lg"
                    />
                    {interimText && (
                      <p className="max-w-lg px-4 text-center text-sm leading-relaxed text-muted/70 italic">
                        {interimText}
                      </p>
                    )}
                  </div>
                ) : (
                <div ref={transcriptContainerRef} className="relative min-h-0 flex-1">
                  {showTranscript ? (
                    <TranscriptSegmentList
                      segments={transcript.segments}
                      fullText={transcript.text}
                      currentTime={currentTime}
                      query={search.query}
                      activeMatch={search.activeMatch}
                      onSeek={handleSeek}
                      className="max-h-[calc(100dvh-16rem)]"
                    />
                  ) : showLoading ? (
                    <TranscriptLoadingState />
                  ) : phase === 'failed' ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                      <div className="relative mb-8 w-full max-w-md">
                        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-red/[0.08] blur-3xl" />
                        <TranscriptWaveformPreview isPlaying={false} progress={0} className="relative" />
                      </div>
                      <p className="text-lg font-semibold text-red">Transcription Failed</p>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{error}</p>
                      <button
                        type="button"
                        onClick={() => void retryTranscription()}
                        className={cn(
                          'mt-6 inline-flex items-center gap-2 rounded-full border border-red/25 px-5 py-2.5',
                          'text-sm font-medium text-red transition-all cursor-pointer hover:bg-red/[0.08]',
                          'shadow-[0_0_24px_rgba(239,68,68,0.08)]',
                        )}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                      </button>
                    </div>
                  ) : showEmpty ? (
                    <TranscriptEmptyState message="Upload or record a lecture to begin." />
                  ) : null}

                  {phase === 'ready' && canTranscribe && !isTranscribing && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-x-0 bottom-6 flex justify-center"
                    >
                      <button
                        type="button"
                        onClick={() => void startTranscription()}
                        className={cn(
                          'rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                          'shadow-[0_0_24px_rgba(214,162,11,0.2)] cursor-pointer hover:bg-accent-soft',
                        )}
                      >
                        Start transcription
                      </button>
                    </motion.div>
                  )}
                </div>
                )}
              </div>
            </section>
          </FadeUp>

          <FadeUp delay={0.12}>
            <TranscriptAIPanel
              draft={aiDraft}
              onDraftChange={setAiDraft}
              transcriptText={transcript?.text ?? null}
              className="xl:sticky xl:top-24 xl:self-start"
            />
          </FadeUp>
        </div>
      )}

      <AnimatePresence>
        {selection && showTranscript && (
          <TranscriptSelectionMenu
            selection={selection}
            onAction={handleSelectionAction}
            onClose={clearSelection}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
