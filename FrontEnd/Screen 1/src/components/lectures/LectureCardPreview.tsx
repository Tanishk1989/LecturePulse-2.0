import { useEffect, useImperativeHandle, useRef, useState, forwardRef, type RefObject } from 'react'
import { FileText, Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/formatDuration'
import { getLectureMediaKind } from '@/lib/lectureFilters'
import type { LectureRecording } from '@/types/lecture'
import { cn } from '@/lib/utils'

export interface LectureCardPreviewHandle {
  togglePlay: () => void
}

interface LectureCardPreviewProps {
  lecture: LectureRecording
  compact?: boolean
}

export const LectureCardPreview = forwardRef<LectureCardPreviewHandle, LectureCardPreviewProps>(
  function LectureCardPreview({ lecture, compact = false }, ref) {
    const kind = getLectureMediaKind(lecture)
    const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [loadedDuration, setLoadedDuration] = useState(lecture.duration ?? 0)

    useEffect(() => {
      return () => {
        mediaRef.current?.pause()
        mediaRef.current = null
      }
    }, [])

    const togglePlay = () => {
      if (kind === 'pdf') return

      if (kind === 'video') {
        if (isPlaying) {
          mediaRef.current?.pause()
          setIsPlaying(false)
          return
        }
        setIsPlaying(true)
        return
      }

      if (!mediaRef.current) {
        const element = document.createElement('audio')
        element.src = lecture.audioUrl
        element.onended = () => setIsPlaying(false)
        element.ontimeupdate = () => setCurrentTime(element.currentTime)
        element.onloadedmetadata = () => {
          if (Number.isFinite(element.duration)) {
            setLoadedDuration(Math.floor(element.duration))
          }
        }
        mediaRef.current = element
      }

      if (isPlaying) {
        mediaRef.current.pause()
        setIsPlaying(false)
        return
      }

      void mediaRef.current.play()
      setIsPlaying(true)
    }

    useImperativeHandle(ref, () => ({ togglePlay }))

    const handleSeek = (value: number) => {
      if (!mediaRef.current) return
      mediaRef.current.currentTime = value
      setCurrentTime(value)
    }

    const progress = loadedDuration > 0 ? (currentTime / loadedDuration) * 100 : 0

    if (kind === 'pdf') {
      return (
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]',
            compact ? 'h-[120px]' : 'h-[160px]',
          )}
        >
          <div className="flex h-full">
            <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-white/[0.06] bg-emerald/[0.04]">
              <FileText className="h-7 w-7 text-emerald" strokeWidth={1.5} />
              <p className="mt-2 text-[10px] font-medium text-muted">
                {lecture.pageCount ? `${lecture.pageCount} pg` : 'PDF'}
              </p>
            </div>
            <iframe src={lecture.audioUrl} title={lecture.title} className="h-full flex-1 bg-white" />
          </div>
        </div>
      )
    }

    if (kind === 'video') {
      return (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/50',
            compact ? 'aspect-[16/10]' : 'aspect-video',
          )}
        >
          {isPlaying ? (
            <video
              ref={mediaRef as RefObject<HTMLVideoElement>}
              src={lecture.audioUrl}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) => {
                if (Number.isFinite(event.currentTarget.duration)) {
                  setLoadedDuration(Math.floor(event.currentTarget.duration))
                }
              }}
            />
          ) : lecture.thumbnail ? (
            <img
              src={lecture.thumbnail}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <video
              src={lecture.audioUrl}
              className="h-full w-full object-cover"
              preload="metadata"
              muted
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className={cn(
              'absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center',
              'rounded-full border border-white/20 bg-black/45 text-foreground backdrop-blur-md',
              compact ? 'h-11 w-11' : 'h-14 w-14',
              'transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:border-accent/40 hover:text-accent',
              isPlaying && 'opacity-0 hover:opacity-100',
            )}
          >
            {isPlaying ? (
              <Pause className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
            ) : (
              <Play className={cn(compact ? 'h-4 w-4 ml-0.5' : 'h-6 w-6 ml-0.5')} />
            )}
          </button>

          <div className="absolute bottom-2 right-2 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[10px] tabular-nums text-foreground backdrop-blur-md">
            {formatDuration(isPlaying ? Math.floor(currentTime) : loadedDuration)}
          </div>
        </div>
      )
    }

    const bars = Array.from({ length: compact ? 24 : 32 }, (_, index) => {
      const wave = Math.sin(index * 0.55) * 0.35 + Math.cos(index * 0.25) * 0.25 + 0.45
      const active = (index / 32) * 100 <= progress
      return { height: 8 + wave * (compact ? 16 : 24), active }
    })

    return (
      <div
        className={cn(
          'rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3',
          compact ? 'space-y-2' : 'space-y-3 p-4',
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/[0.08] text-accent',
              'transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.18)]',
              compact ? 'h-9 w-9' : 'h-11 w-11',
            )}
          >
            {isPlaying ? (
              <Pause className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            ) : (
              <Play className={cn(compact ? 'h-3.5 w-3.5 ml-0.5' : 'h-4 w-4 ml-0.5')} />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className={cn('flex items-end gap-[2px]', compact ? 'h-8' : 'h-10')}>
              {bars.map((bar, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-[2px] rounded-full md:w-[3px]',
                    bar.active
                      ? 'bg-gradient-to-t from-accent/45 to-accent'
                      : 'bg-white/[0.08]',
                  )}
                  style={{ height: `${bar.height}px` }}
                />
              ))}
            </div>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={loadedDuration || 1}
          step={0.1}
          value={currentTime}
          onChange={(event) => handleSeek(Number(event.target.value))}
          className="w-full accent-accent cursor-pointer"
          aria-label="Seek audio"
        />

        <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{formatDuration(loadedDuration)}</span>
        </div>
      </div>
    )
  },
)
