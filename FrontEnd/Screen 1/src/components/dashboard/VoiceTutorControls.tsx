import { motion } from 'framer-motion'
import { Keyboard, Mic, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VoiceTutorPhase } from '@/hooks/useVoiceTutor'

interface VoiceTutorControlsProps {
  phase: VoiceTutorPhase
  ttsEnabled: boolean
  tutorResponseText: string | null
  micError: string | null
  onPrimaryAction: () => void
  onSwitchToText: () => void
  onToggleTts: () => void
}

function getStatusText(phase: VoiceTutorPhase): { primary: string; secondary: string } {
  switch (phase) {
    case 'initializing':
      return { primary: 'Starting microphone…', secondary: '' }
    case 'listening':
      return { primary: 'Listening…', secondary: 'Tap to pause' }
    case 'transcribing':
      return { primary: 'Transcribing…', secondary: 'Sending your question' }
    case 'thinking':
      return { primary: 'Thinking…', secondary: 'Your tutor is preparing a response' }
    case 'speaking':
      return { primary: 'Speaking…', secondary: 'Tap to pause' }
    case 'ready':
      return { primary: 'Ready', secondary: 'Tap the button to speak' }
    case 'error':
      return { primary: 'Something went wrong', secondary: 'Switch to typing to continue' }
    default:
      return { primary: '', secondary: '' }
  }
}

export function VoiceTutorControls({
  phase,
  ttsEnabled,
  tutorResponseText,
  micError,
  onPrimaryAction,
  onSwitchToText,
  onToggleTts,
}: VoiceTutorControlsProps) {
  const { primary, secondary } = getStatusText(phase)
  const isListening = phase === 'listening'
  const isSpeaking = phase === 'speaking'
  const showPulse = isListening
  const primaryShowsPause = isListening || isSpeaking

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-[var(--bg-soft)] px-4 py-5',
        'flex flex-col items-center gap-4',
      )}
    >
      <div className="relative flex items-center justify-center">
        {showPulse && (
          <>
            <motion.span
              className="absolute h-[88px] w-[88px] rounded-full border border-accent/40"
              animate={{ scale: [1, 1.18], opacity: [0.55, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute h-[88px] w-[88px] rounded-full border border-accent/25"
              animate={{ scale: [1, 1.28], opacity: [0.35, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut', delay: 0.35 }}
            />
          </>
        )}

        <button
          type="button"
          onClick={onPrimaryAction}
          aria-label={primaryShowsPause ? 'Pause' : 'Start speaking'}
          disabled={phase === 'initializing' || phase === 'transcribing' || phase === 'thinking'}
          className={cn(
            'relative z-10 flex h-20 w-20 items-center justify-center rounded-full',
            'border border-border bg-card/80 text-accent shadow-premium',
            'transition-transform duration-200 hover:scale-[1.03] cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          )}
        >
          <Mic className="h-8 w-8" strokeWidth={1.75} />
        </button>
      </div>

      <div className="text-center space-y-0.5">
        <p className="text-sm font-medium text-foreground">{primary}</p>
        {secondary && <p className="text-xs text-muted">{secondary}</p>}
        {micError && <p className="text-xs text-red mt-1">{micError}</p>}
      </div>

      <div
        className={cn(
          'w-full min-h-[72px] rounded-lg border border-border bg-card/60 px-3 py-2.5',
          'text-left text-sm leading-relaxed',
        )}
      >
        {tutorResponseText ? (
          <p className="text-foreground/90">
            <span className="font-semibold text-accent">Tutor said: </span>
            {tutorResponseText}
          </p>
        ) : (
          <p className="text-muted text-xs italic">
            {phase === 'thinking'
              ? 'Waiting for tutor response…'
              : 'Tutor responses will appear here'}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 w-full">
        <button
          type="button"
          onClick={onSwitchToText}
          aria-label="Switch to text chat"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            'border border-border bg-card/70 text-muted hover:text-foreground hover:border-accent/25',
            'transition-colors cursor-pointer',
          )}
        >
          <Keyboard className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={onPrimaryAction}
          aria-label={primaryShowsPause ? 'Pause' : 'Play'}
          disabled={phase === 'initializing' || phase === 'transcribing' || phase === 'thinking'}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full bg-accent text-background',
            'shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.25)]',
            'hover:bg-accent-soft transition-colors cursor-pointer',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {primaryShowsPause ? (
            <Pause className="h-5 w-5" fill="currentColor" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
          )}
        </button>

        <button
          type="button"
          onClick={onToggleTts}
          aria-label={ttsEnabled ? 'Mute tutor voice' : 'Enable tutor voice'}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            'border border-border bg-card/70 transition-colors cursor-pointer',
            ttsEnabled
              ? 'text-accent border-accent/25 hover:border-accent/40'
              : 'text-muted hover:text-foreground hover:border-accent/25',
          )}
        >
          {ttsEnabled ? (
            <Volume2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <VolumeX className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>

      <p className="text-[11px] text-muted-tertiary">Switch to typing anytime</p>
    </div>
  )
}
