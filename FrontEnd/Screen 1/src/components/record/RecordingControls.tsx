import { Pause, Play, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecordingControlsProps {
  status: 'recording' | 'paused'
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

const controlBase = cn(
  'flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl',
  'transition-all duration-300 cursor-pointer md:h-14 md:w-14',
  'hover:-translate-y-0.5 hover:scale-[1.03]',
)

export function RecordingControls({ status, onPause, onResume, onStop }: RecordingControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4 md:gap-5">
      {status === 'recording' ? (
        <button
          type="button"
          onClick={onPause}
          aria-label="Pause recording"
          className={cn(
            controlBase,
            'border-accent/30 bg-accent/[0.08] text-accent',
            'hover:border-accent/45 hover:shadow-[0_0_28px_rgba(var(--color-accent-rgb),0.22)]',
          )}
        >
          <Pause className="h-5 w-5" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onResume}
          aria-label="Resume recording"
          className={cn(
            controlBase,
            'border-emerald/30 bg-emerald/[0.08] text-emerald',
            'hover:border-emerald/45 hover:shadow-[0_0_28px_rgba(16,185,129,0.22)]',
          )}
        >
          <Play className="h-5 w-5 ml-0.5" strokeWidth={2} />
        </button>
      )}

      <button
        type="button"
        onClick={onStop}
        aria-label="Stop recording"
        className={cn(
          controlBase,
          'border-red/30 bg-red/[0.08] text-red',
          'hover:border-red/45 hover:shadow-[0_0_28px_rgba(239,68,68,0.22)]',
        )}
      >
        <Square className="h-[18px] w-[18px] fill-current" strokeWidth={2} />
      </button>
    </div>
  )
}
