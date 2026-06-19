import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/formatDuration'
import { cn } from '@/lib/utils'

interface VideoPreviewPlayerProps {
  url: string
  duration: number
}

export function VideoPreviewPlayer({ url, duration }: VideoPreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loadedDuration, setLoadedDuration] = useState(duration)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onLoaded = () => {
      if (Number.isFinite(video.duration)) {
        setLoadedDuration(Math.floor(video.duration))
      }
    }
    const onEnded = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('ended', onEnded)
    }
  }, [url])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      setIsPlaying(false)
      return
    }

    void video.play()
    setIsPlaying(true)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40">
      <video
        ref={videoRef}
        src={url}
        className="aspect-video w-full object-cover"
        preload="metadata"
        playsInline
        onClick={togglePlay}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause video preview' : 'Play video preview'}
        className={cn(
          'absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
          'rounded-full border border-white/20 bg-black/45 text-foreground backdrop-blur-md',
          'transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:border-accent/40 hover:text-accent',
          isPlaying && 'opacity-0 hover:opacity-100',
        )}
      >
        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
      </button>

      <div className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-xs tabular-nums text-foreground backdrop-blur-md">
        {formatDuration(loadedDuration)}
      </div>
    </div>
  )
}
