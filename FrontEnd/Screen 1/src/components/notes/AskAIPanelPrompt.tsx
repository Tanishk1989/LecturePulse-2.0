import { useEffect } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'

export function AskAIPanelPrompt() {
  const { openTutor } = useDashboard()

  useEffect(() => {
    openTutor()
  }, [openTutor])

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08]">
        <Sparkles className="h-6 w-6 text-accent" strokeWidth={1.75} />
      </div>
      <div className="max-w-sm space-y-2">
        <h3 className="text-base font-semibold text-foreground">Ask AI moved to the side panel</h3>
        <p className="text-sm text-muted leading-relaxed">
          Use the Ask AI panel on the right (desktop) or the Pulse button (mobile) for all questions
          about this lecture.
        </p>
      </div>
      <button
        type="button"
        onClick={() => openTutor()}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/[0.08]',
          'px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent/[0.12]',
          'transition-all duration-300 cursor-pointer',
        )}
      >
        Open Ask AI
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}
