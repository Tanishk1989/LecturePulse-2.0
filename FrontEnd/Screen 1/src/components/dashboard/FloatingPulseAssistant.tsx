import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Flame, ListTodo, MessageCircle, RotateCcw, Sparkles, X } from 'lucide-react'
import { useDashboard } from '@/context/DashboardContext'
import { MetricMiniCard } from '@/components/dashboard/ui/MetricMiniCard'
import { PulseFabIcon } from '@/components/dashboard/ui/PulseFabIcon'
import { cn } from '@/lib/utils'

const pulseActions = [
  { id: 'explain', label: 'Explain', icon: Sparkles },
  { id: 'revise', label: 'Revise', icon: BookOpen },
  { id: 'notes', label: 'Generate Notes', icon: MessageCircle },
  { id: 'ask', label: 'Ask Anything', icon: Sparkles },
]

export function FloatingPulseAssistant() {
  const location = useLocation()
  const { pulseExpanded, togglePulse, setPulseExpanded, openTutor } = useDashboard()

  if (location.pathname.startsWith('/transcript')) return null

  return (
    <div className="fixed bottom-7 right-7 z-50 flex flex-col items-end gap-3 xl:right-[calc(350px+1.75rem)]">
      <AnimatePresence>
        {pulseExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="w-[340px] rounded-2xl border border-accent/20 bg-card shadow-[0_0_60px_rgba(214,162,11,0.15)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 bg-accent/[0.04]">
              <div className="flex items-center gap-2.5">
                <PulseFabIcon size={36} className="shadow-none border-accent/30" />
                <span className="font-heading text-base text-accent">Pulse</span>
              </div>
              <button
                onClick={() => setPulseExpanded(false)}
                className="p-1 text-muted hover:text-foreground cursor-pointer transition-colors duration-300"
                aria-label="Close Pulse"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <MetricMiniCard label="Tasks Due" value="0" icon={ListTodo} accent="gold" />
              <MetricMiniCard label="Weak Areas" value="0" icon={Flame} accent="red" />
              <MetricMiniCard label="Upcoming Reviews" value="0" icon={RotateCcw} accent="indigo" />

              <div className="grid grid-cols-2 gap-2 pt-1">
                {pulseActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      openTutor(action.label)
                      setPulseExpanded(false)
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08]',
                      'bg-white/[0.02] px-3 py-2.5 text-xs text-muted',
                      'hover:text-accent hover:border-accent/25 hover:-translate-y-0.5',
                      'transition-all duration-300 cursor-pointer',
                    )}
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={togglePulse}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="cursor-pointer rounded-full"
        aria-label="Open Pulse assistant"
      >
        <PulseFabIcon
          size={58}
          className="hover:border-accent/50 hover:shadow-[0_0_40px_rgba(214,162,11,0.35),0_0_80px_rgba(214,162,11,0.15)]"
        />
      </motion.button>
    </div>
  )
}
