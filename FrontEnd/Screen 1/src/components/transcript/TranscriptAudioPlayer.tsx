import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

export interface TranscriptAudioPlayerHandle {
  seekTo: (seconds: number) => void
  togglePlay: () => void
  getCurrentTime: () => number
}

interface TranscriptAudioPlayerProps {
  url: string
  duration: number
  onTimeUpdate?: (currentTime: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  className?: string
}

export const TranscriptAudioPlayer = forwardRef<
  TranscriptAudioPlayerHandle,
  TranscriptAudioPlayerProps
>(function TranscriptAudioPlayer(
  { url, duration, onTimeUpdate, onPlayStateChange, className },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loadedDuration, setLoadedDuration] = useState(duration)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)
    }
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setLoadedDuration(Math.floor(audio.duration))
      }
    }
    const onEnded = () => {
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [onPlayStateChange, onTimeUpdate, url])

  useEffect(() => {
    setCurrentTime(0)
    setIsPlaying(false)
    setLoadedDuration(duration)
  }, [duration, url])

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, seconds)
    setCurrentTime(audio.currentTime)
    onTimeUpdate?.(audio.currentTime)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
      return
    }

    void audio.play()
    setIsPlaying(true)
    onPlayStateChange?.(true)
  }

  useImperativeHandle(ref, () => ({
    seekTo,
    togglePlay,
    getCurrentTime: () => audioRef.current?.currentTime ?? 0,
  }))

  const handleSeek = (value: number) => {
    seekTo(value)
  }

  const progress = loadedDuration > 0 ? (currentTime / loadedDuration) * 100 : 0
  const bars = Array.from({ length: 48 }, (_, index) => {
    const wave = Math.sin(index * 0.42) * 0.32 + Math.cos(index * 0.18) * 0.22 + 0.48
    const active = (index / 48) * 100 <= progress
    return { height: 10 + wave * 34, active }
  })

  return (
    <div
      className={cn(
        'rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 md:p-6',
        'shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        className,
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            Playback
          </p>
          <p className="mt-1 text-sm text-foreground/90">Synced with playback</p>
        </div>
        <div className="font-mono text-xs tabular-nums text-muted">
          {formatDuration(Math.floor(currentTime))} / {formatDuration(loadedDuration)}
        </div>
      </div>

      <div className="mb-5 flex h-16 items-end gap-[2px] px-1">
        {bars.map((bar, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 rounded-full transition-all duration-200',
              bar.active
                ? 'bg-gradient-to-t from-accent/45 via-accent to-accent-soft shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.25)]'
                : 'bg-white/[0.07]',
            )}
            style={{ height: `${bar.height}px` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/35',
            'bg-accent/[0.1] text-accent transition-all duration-300 cursor-pointer',
            'hover:-translate-y-0.5 hover:scale-[1.04] hover:shadow-[0_0_32px_rgba(var(--color-accent-rgb),0.28)]',
          )}
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
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
        </div>
      </div>
    </div>
  )
})
