import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

export interface TranscriptAudioEngineHandle {
  play: () => void
  pause: () => void
  togglePlay: () => void
  restart: () => void
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  isPlaying: () => boolean
}

interface TranscriptAudioEngineProps {
  url: string
  onTimeUpdate?: (currentTime: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onDurationChange?: (duration: number) => void
}

export const TranscriptAudioEngine = forwardRef<
  TranscriptAudioEngineHandle,
  TranscriptAudioEngineProps
>(function TranscriptAudioEngine(
  { url, onTimeUpdate, onPlayStateChange, onDurationChange },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => onTimeUpdate?.(audio.currentTime)
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        onDurationChange?.(Math.floor(audio.duration))
      }
    }
    const onEnded = () => {
      setPlaying(false)
      onPlayStateChange?.(false)
    }
    const onPlay = () => {
      setPlaying(true)
      onPlayStateChange?.(true)
    }
    const onPause = () => {
      setPlaying(false)
      onPlayStateChange?.(false)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [onDurationChange, onPlayStateChange, onTimeUpdate, url])

  useEffect(() => {
    setPlaying(false)
  }, [url])

  const seekTo = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, seconds)
    onTimeUpdate?.(audio.currentTime)
  }

  const play = () => {
    const audio = audioRef.current
    if (!audio) return
    void audio.play()
  }

  const pause = () => {
    audioRef.current?.pause()
  }

  const togglePlay = () => {
    if (playing) pause()
    else play()
  }

  const restart = () => {
    seekTo(0)
    play()
  }

  useImperativeHandle(ref, () => ({
    play,
    pause,
    togglePlay,
    restart,
    seekTo,
    getCurrentTime: () => audioRef.current?.currentTime ?? 0,
    isPlaying: () => playing,
  }))

  return <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
})
