import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Copy,
  Layers,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { FadeUp } from '@/components/effects/FadeUp'
import {
  TranscriptAudioEngine,
  type TranscriptAudioEngineHandle,
} from '@/components/transcript/TranscriptAudioEngine'
import { useDashboard } from '@/context/DashboardContext'
import { TranscriptEmptyState } from '@/components/transcript/TranscriptEmptyState'
import { TranscriptLoadingState } from '@/components/transcript/TranscriptLoadingState'
import { TranscriptSearchBar } from '@/components/transcript/TranscriptSearchBar'
import {
  TranscriptSegmentList,
  type TranscriptSegmentListHandle,
} from '@/components/transcript/TranscriptSegmentList'
import { TranscriptionProgressCard } from '@/components/transcript/TranscriptionProgressCard'
import { useLectures } from '@/hooks/useLectures'
import { useTranscription } from '@/hooks/useTranscription'
import { useTranscriptSearch } from '@/hooks/useTranscriptSearch'
import { getLectureMediaKind } from '@/lib/lectureFilters'
import { cn } from '@/lib/utils'
import { dashboardPageTitleClass } from '@/components/dashboard/ui/DashboardPageShell'
import { useAuthContext } from '@/context/AuthContext'
import { formatDuration, formatRelativeDate } from '@/lib/formatDuration'
import { formatLanguage } from '@/lib/transcriptUtils'
import { generateFlashcardFromExcerpt } from '@/services/aiGenerationService'
import { createFlashcards } from '@/services/flashcardService'
import { detectSpeakers } from '@/services/speakerDetectionService'
import { updateTranscript } from '@/services/transcriptionService'
import { hasSpeakerLabels } from '@/lib/speakerLabels'
import type { SpeakerRole, TranscriptSegment } from '@/types/transcript'
import { useToast } from '@/components/ui/ToastProvider'
import { TranslateContentButton } from '@/components/shared/TranslateContentButton'

function cleanLectureTitle(title: string): string {
  let clean = title.replace(/\.(mp3|wav|m4a|webm|mp4|pdf)$/i, '')
  clean = clean.replace(/^[🎙📄]\s*/, '')
  if (/^recording-\d+$/i.test(clean)) {
    const timestamp = parseInt(clean.replace(/recording-/i, ''))
    if (!isNaN(timestamp)) {
      clean = `Live Recording (${new Date(timestamp).toLocaleDateString()})`
    }
  }
  return clean.trim()
}

export function TranscriptPage() {
  const { lectureId } = useParams<{ lectureId: string }>()
  const { lectures, loading: lecturesLoading, refresh: refreshLectures, toggleFavorite } = useLectures()
  const { user } = useAuthContext()
  const { openTutor } = useDashboard()
  const { toast } = useToast()

  const playerRef = useRef<TranscriptAudioEngineHandle>(null)
  const transcriptListRef = useRef<TranscriptSegmentListHandle>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Overhaul Layout & controls states
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('md')
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerRole | 'all'>('all')
  const [detectingSpeakers, setDetectingSpeakers] = useState(false)
  const [segmentsOverride, setSegmentsOverride] = useState<TranscriptSegment[] | null>(null)

  // Floating selection toolbar state
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

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
    retryTranscription,
    refresh: refreshTranscript,
  } = useTranscription(lectureId, lecture?.audioUrl, {
    autoTranscribe: isTranscribable,
    onLectureStatusChange: () => void refreshLectures(),
  })

  const segments = transcript?.segments ?? []
  const displaySegments = useMemo(() => {
    const base = segmentsOverride ?? segments
    if (speakerFilter === 'all') return base
    return base.filter((segment) => segment.speaker === speakerFilter)
  }, [segments, segmentsOverride, speakerFilter])

  const speakersDetected = useMemo(
    () => hasSpeakerLabels(segmentsOverride ?? segments),
    [segments, segmentsOverride],
  )

  useEffect(() => {
    setSegmentsOverride(null)
    setSpeakerFilter('all')
  }, [transcript?.id, transcript?.updatedAt])

  const handleDetectSpeakers = useCallback(async () => {
    if (!user || !transcript || segments.length === 0) return

    setDetectingSpeakers(true)
    try {
      const labeled = await detectSpeakers(segmentsOverride ?? segments, {
        subject: lecture?.subject ?? undefined,
      })
      await updateTranscript(transcript.id, user.uid, { segments: labeled })
      setSegmentsOverride(labeled)
      toast.success('Speaker labels updated.')
      void refreshTranscript()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Speaker detection failed.')
    } finally {
      setDetectingSpeakers(false)
    }
  }, [lecture?.subject, refreshTranscript, segments, segmentsOverride, toast, transcript, user])

  const search = useTranscriptSearch(displaySegments)

  const effectiveDuration = duration || lecture?.duration || 0

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    transcriptListRef.current?.updateTime(time)
  }

  const handleSeek = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds)
    setCurrentTime(seconds)
    transcriptListRef.current?.updateTime(seconds)
  }, [])

  const handleWordSeek = useCallback((seconds: number) => {
    playerRef.current?.seekAndPlay(seconds)
    setCurrentTime(seconds)
    setIsPlaying(true)
    transcriptListRef.current?.updateTime(seconds)
  }, [])

  const handleMatchNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      const match =
        direction === 'next' ? search.goToNextMatch() : search.goToPreviousMatch()

      if (match) {
        const segment = displaySegments[match.segmentIndex]
        if (segment) handleSeek(segment.start)
      }
    },
    [handleSeek, search, displaySegments],
  )

  // Floating selection toolbar listeners
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectionToolbar(null)
        return
      }

      const text = selection.toString().trim()
      if (!text) {
        setSelectionToolbar(null)
        return
      }

      const container = transcriptContainerRef.current
      if (!container || !container.contains(selection.anchorNode)) {
        return
      }

      try {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        setSelectionToolbar({
          text,
          x: rect.left + rect.width / 2,
          y: rect.top - 12,
        })
      } catch {
        setSelectionToolbar(null)
      }
    }

    const handleScroll = () => {
      setSelectionToolbar(null)
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  // Action handlers
  const handleToggleFavorite = async () => {
    if (!lecture) return
    try {
      await toggleFavorite(lecture.id)
      toast.success(lecture.favorite ? 'Removed from bookmarks' : 'Added to bookmarks')
    } catch {
      toast.error('Failed to update bookmark status.')
    }
  }

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2]
    const currentIndex = speeds.indexOf(playbackSpeed)
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length]
    setPlaybackSpeed(nextSpeed)
    playerRef.current?.setPlaybackRate(nextSpeed)
  }

  const cycleTextSize = () => {
    if (textSize === 'sm') setTextSize('md')
    else if (textSize === 'md') setTextSize('lg')
    else setTextSize('sm')
  }

  const handleScrollProgress = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const totalHeight = target.scrollHeight - target.clientHeight
    if (totalHeight > 0) {
      setScrollProgress((target.scrollTop / totalHeight) * 100)
    }
  }

  // Selection toolbar actions
  const handleExplainSelection = () => {
    if (!selectionToolbar) return
    const text = selectionToolbar.text
    window.getSelection()?.removeAllRanges()
    setSelectionToolbar(null)

    const promptText = `Explain this excerpt from the lecture: "${text}"`
    openTutor(promptText)
  }

  const handleAddFlashcardSelection = async () => {
    if (!selectionToolbar) return
    const text = selectionToolbar.text
    window.getSelection()?.removeAllRanges()
    setSelectionToolbar(null)

    if (!user || !lectureId) return

    try {
      toast.success('Creating flashcard...')
      const card = await generateFlashcardFromExcerpt(text, transcript?.text)
      if (card) {
        await createFlashcards(user.uid, lectureId, [card])
        toast.success('Flashcard added to deck!')
      } else {
        toast.error('Failed to generate flashcard.')
      }
    } catch {
      toast.error('Failed to add flashcard.')
    }
  }

  const handleCopySelection = () => {
    if (!selectionToolbar) return
    const text = selectionToolbar.text
    window.getSelection()?.removeAllRanges()
    setSelectionToolbar(null)

    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  if (!lectureId || (!lecturesLoading && !lecture)) {
    return <Navigate to="/dashboard/lectures" replace />
  }

  const showTranscript = phase === 'completed' && transcript
  const showLoading = isLoading || (phase === 'ready' && canTranscribe)
  const showTranscribing = isTranscribing
  const showEmpty = !showTranscript && !showLoading && !showTranscribing && phase !== 'failed'

  const cleanedTitle = lecture ? cleanLectureTitle(lecture.title) : '🎙 Lecture Transcript'
  const mediaLabel = mediaKind ? mediaKind.charAt(0).toUpperCase() + mediaKind.slice(1) : 'Audio'
  const durationLabel = effectiveDuration > 0 ? formatDuration(effectiveDuration) : '—'
  const dateLabel = lecture ? formatRelativeDate(lecture.createdAt) : 'Today'
  const metaLine = `${mediaLabel} · ${durationLabel} · ${dateLabel}`

  const textSizeClass =
    textSize === 'sm'
      ? 'text-[14px] leading-[1.9]'
      : textSize === 'lg'
        ? 'text-[19px] leading-[2.3]'
        : 'text-[16px] leading-[2.1]'

  return (
    <div className="mx-auto w-full max-w-[1600px] min-h-screen relative pb-16">
      {lecture?.audioUrl && (
        <TranscriptAudioEngine
          ref={playerRef}
          url={lecture.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlayStateChange={setIsPlaying}
          onDurationChange={setDuration}
        />
      )}

      {/* Centered reading layout column */}
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 space-y-6">
        <FadeUp>
          <Link
            to="/dashboard/lectures"
            className={cn(
              'inline-flex items-center gap-2 text-xs text-muted transition-colors',
              'hover:text-foreground cursor-pointer',
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to library
          </Link>
        </FadeUp>

        {isTranscribable && lecture && (
          <FadeUp delay={0.04}>
            {/* Header section */}
            <div className="space-y-2 mt-4">
              <p className="text-xs text-muted/80 tracking-wide font-medium">
                {metaLine}
              </p>
              <div className="flex items-start justify-between gap-4">
                <h1 className={cn('min-w-0 flex-1', dashboardPageTitleClass)}>
                  {cleanedTitle}
                </h1>
                <div className="flex items-center gap-1.5 shrink-0 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-muted transition-colors cursor-pointer hover:bg-white/[0.08] hover:text-foreground',
                      lecture.favorite && 'text-accent border-accent/20 bg-accent/[0.04] hover:text-accent-soft',
                    )}
                  >
                    <Bookmark className={cn('h-4.5 w-4.5', lecture.favorite && 'fill-accent')} />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-muted transition-colors cursor-pointer hover:bg-white/[0.08] hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4.5 w-4.5" />
                    </button>
                    {moreMenuOpen && (
                      <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl border border-white/[0.08] bg-[#161616] p-1.5 shadow-2xl">
                        <button
                          type="button"
                          disabled
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-muted/40 cursor-not-allowed"
                        >
                          Download audio
                        </button>
                        <button
                          type="button"
                          disabled
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-muted/40 cursor-not-allowed"
                        >
                          Share lecture
                        </button>
                        <button
                          type="button"
                          disabled
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs text-muted/40 cursor-not-allowed"
                        >
                          Delete lecture
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pill Scrubber Mini Player */}
            <div className="rounded-full border border-white/[0.08] bg-[#111]/85 backdrop-blur-md px-4 py-2.5 flex items-center gap-3.5 shadow-lg select-none mt-6">
              <button
                type="button"
                onClick={() => playerRef.current?.togglePlay()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="h-4.5 w-4.5 fill-background" />
                ) : (
                  <Play className="h-4.5 w-4.5 fill-background ml-0.5" />
                )}
              </button>
              <span className="font-mono text-xs text-muted/90 tabular-nums shrink-0">
                {formatDuration(currentTime)}
              </span>

              <div className="flex-1 min-w-0">
                <input
                  type="range"
                  min={0}
                  max={effectiveDuration || 1}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none focus:ring-0"
                  aria-label="Seek audio"
                />
              </div>

              <span className="font-mono text-xs text-muted/90 tabular-nums shrink-0">
                {formatDuration(effectiveDuration)}
              </span>

              <button
                type="button"
                onClick={cycleSpeed}
                className="text-[11px] font-mono font-bold tracking-tight rounded-lg bg-white/[0.06] border border-white/[0.04] px-2 py-1 hover:bg-white/[0.1] hover:border-accent/25 hover:text-accent cursor-pointer transition-colors shrink-0"
              >
                {playbackSpeed}x
              </button>
            </div>

            {/* Quick controls row */}
            <div className="flex items-center gap-2 py-2 mt-2">
              <button
                type="button"
                onClick={cycleTextSize}
                className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted hover:bg-white/[0.06] hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5"
              >
                Aa <span className="text-[10px] opacity-60 capitalize">({textSize})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={cn(
                  'rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted hover:bg-white/[0.06] hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5',
                  showSearchBar && 'border-accent/30 bg-accent/[0.04] text-accent hover:text-accent',
                )}
              >
                Find
              </button>
              {showTranscript && transcript?.text && (
                <TranslateContentButton
                  sourceText={transcript.text}
                  contextLabel="lecture transcript"
                />
              )}
              {showTranscript && segments.length > 0 && (
                <>
                  <button
                    type="button"
                    disabled={detectingSpeakers}
                    onClick={() => void handleDetectSpeakers()}
                    className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted hover:bg-white/[0.06] hover:text-foreground cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {detectingSpeakers ? 'Detecting…' : speakersDetected ? 'Re-detect speakers' : 'Detect speakers'}
                  </button>
                  {speakersDetected && (
                    <div className="flex items-center gap-1">
                      {(['all', 'professor', 'student'] as const).map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setSpeakerFilter(filter)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-[11px] capitalize cursor-pointer transition-colors',
                            speakerFilter === filter
                              ? 'border-accent/30 bg-accent/[0.08] text-accent'
                              : 'border-white/[0.06] bg-white/[0.02] text-muted hover:text-foreground',
                          )}
                        >
                          {filter === 'all' ? 'All' : filter}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-xs text-muted flex items-center gap-1.5 uppercase font-mono">
                {transcript?.language ? formatLanguage(transcript.language) : 'EN'}
              </span>
            </div>

            {/* Search Bar viewport dropdown */}
            {showSearchBar && showTranscript && (
              <div className="mt-2">
                <TranscriptSearchBar
                  query={search.query}
                  onQueryChange={search.setQuery}
                  matchCount={search.matchCount}
                  activeMatchIndex={search.activeMatchIndex}
                  onNextMatch={() => handleMatchNavigation('next')}
                  onPreviousMatch={() => handleMatchNavigation('prev')}
                  hasQuery={search.hasQuery}
                />
              </div>
            )}

            {/* Transcript Block */}
            <div className="mt-4">
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
                <div
                  ref={transcriptContainerRef}
                  className="relative min-h-0 flex-1"
                >
                  {showTranscript ? (
                    <>
                      <p className="text-center text-xs text-muted/65 select-none pb-4 pt-1 font-medium tracking-wide border-b border-white/[0.04] mb-6">
                        Click any word to jump there · Select text for actions
                      </p>
                      <TranscriptSegmentList
                        ref={transcriptListRef}
                        segments={displaySegments}
                        fullText={transcript.text}
                        query={search.query}
                        activeMatch={search.activeMatch}
                        onSeek={handleWordSeek}
                        hasPlayer={Boolean(lecture.audioUrl)}
                        onScroll={handleScrollProgress}
                        className={cn('max-h-[calc(100dvh-22rem)]', textSizeClass)}
                      />
                    </>
                  ) : showLoading ? (
                    <TranscriptLoadingState />
                  ) : phase === 'failed' ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                      <p className="text-lg font-semibold text-red">Processing failed</p>
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{error}</p>
                      <button
                        type="button"
                        onClick={() => void retryTranscription()}
                        className="mt-6 inline-flex items-center gap-2 rounded-full border border-red/25 px-5 py-2.5 text-sm font-medium text-red transition-all cursor-pointer hover:bg-red/[0.08]"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                      </button>
                    </div>
                  ) : showEmpty ? (
                    <TranscriptEmptyState message="Upload or record a lecture to begin." />
                  ) : null}

                  {/* Sticky Reading Progress Indicator */}
                  {showTranscript && (
                    <div className="sticky bottom-0 left-0 w-full h-[3px] bg-white/[0.06] mt-4 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-75"
                        style={{ width: `${scrollProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </FadeUp>
        )}
      </div>

      {/* Floating Selection Toolbar */}
      {selectionToolbar && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-[#161616]/95 backdrop-blur-md p-1 shadow-2xl text-[11px] text-muted select-none"
          style={{ left: selectionToolbar.x, top: selectionToolbar.y }}
        >
          <button
            type="button"
            onClick={handleExplainSelection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] hover:text-foreground text-muted cursor-pointer transition-colors font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Explain
          </button>
          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />
          <button
            type="button"
            onClick={handleAddFlashcardSelection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] hover:text-foreground text-muted cursor-pointer transition-colors font-semibold"
          >
            <Layers className="h-3.5 w-3.5 text-accent" />
            Add to flashcards
          </button>
          <div className="w-px h-3.5 bg-white/[0.08] mx-1" />
          <button
            type="button"
            onClick={handleCopySelection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] hover:text-foreground text-muted cursor-pointer transition-colors font-semibold"
          >
            <Copy className="h-3.5 w-3.5 text-accent" />
            Copy
          </button>
        </div>
      )}
    </div>
  )
}
