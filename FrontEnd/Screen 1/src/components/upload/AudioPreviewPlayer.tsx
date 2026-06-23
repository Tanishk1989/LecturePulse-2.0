import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

interface AudioPreviewPlayerProps {
  url: string
  duration: number
}

export function AudioPreviewPlayer({ url, duration }: AudioPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [loadedDuration, setLoadedDuration] = useState(duration)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setLoadedDuration(Math.floor(audio.duration))
      }
    }
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [url])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      return
    }

    void audio.play()
    setIsPlaying(true)
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setCurrentTime(value)
  }

  const progress = loadedDuration > 0 ? (currentTime / loadedDuration) * 100 : 0
  const bars = Array.from({ length: 32 }, (_, index) => {
    const wave = Math.sin(index * 0.55) * 0.35 + Math.cos(index * 0.25) * 0.25 + 0.45
    const active = (index / 32) * 100 <= progress
    return { height: 12 + wave * 28, active }
  })

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 md:p-5">
      <audio ref={audioRef} src={url} preload="metadata" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio preview' : 'Play audio preview'}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent/30',
            'bg-accent/[0.08] text-accent transition-all duration-300 cursor-pointer',
            'hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)]',
          )}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex h-12 items-end gap-[3px]">
            {bars.map((bar, index) => (
              <div
                key={index}
                className={cn(
                  'w-[3px] rounded-full transition-colors duration-200',
                  bar.active
                    ? 'bg-gradient-to-t from-accent/50 to-accent'
                    : 'bg-white/[0.08]',
                )}
                style={{ height: `${bar.height}px` }}
              />
            ))}
          </div>

          <input
            type="range"
            min={0}
            max={loadedDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={(event) => handleSeek(Number(event.target.value))}
            className="w-full accent-accent cursor-pointer"
            aria-label="Seek audio preview"
          />

          <div className="mt-2 flex justify-between font-mono text-xs tabular-nums text-muted">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{formatDuration(loadedDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
