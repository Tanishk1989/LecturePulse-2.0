import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const CX = 100
const CY = 100
const BASE_RADIUS = 72

interface MinimalAudioRingProps {
  getAnalyser: () => AnalyserNode | null
  active: boolean
  paused?: boolean
  className?: string
}

export function MinimalAudioRing({
  getAnalyser,
  active,
  paused = false,
  className,
}: MinimalAudioRingProps) {
  const ringRef = useRef<SVGCircleElement>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const levelRef = useRef(0.08)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const ring = ringRef.current
      if (!ring) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const analyser = getAnalyser()
      let target = 0.08

      if (active && analyser && !paused) {
        if (!dataArrayRef.current || dataArrayRef.current.length !== analyser.frequencyBinCount) {
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
        }

        analyser.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>)
        const data = dataArrayRef.current
        const slice = Math.floor(data.length * 0.45)
        let sum = 0
        for (let index = 2; index < slice; index += 1) {
          sum += data[index] ?? 0
        }
        target = Math.min(1, sum / (slice - 2) / 165)
      } else {
        target = 0.06 + Math.sin(Date.now() / 1400) * 0.02
      }

      levelRef.current = levelRef.current * 0.82 + target * 0.18
      const level = levelRef.current
      const breathe = 1 + Math.sin(Date.now() / 1600) * 0.012
      const radius = (BASE_RADIUS + level * 22) * breathe

      ring.setAttribute('r', radius.toFixed(2))
      ring.style.opacity = String(0.18 + level * 0.55)
      ring.style.strokeWidth = `${1 + level * 1.25}`

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [active, getAnalyser, paused])

  return (
    <svg
      viewBox="0 0 200 200"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      aria-hidden
    >
      <circle
        cx={CX}
        cy={CY}
        r={BASE_RADIUS - 4}
        fill="none"
        stroke="rgba(239, 68, 68, 0.08)"
        strokeWidth="1"
      />
      <circle
        ref={ringRef}
        cx={CX}
        cy={CY}
        r={BASE_RADIUS}
        fill="none"
        stroke="#ef4444"
        strokeWidth="1.5"
        opacity={0.25}
        style={{ filter: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.35))' }}
      />
    </svg>
  )
}
