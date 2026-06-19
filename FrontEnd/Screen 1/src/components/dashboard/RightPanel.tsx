import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useDashboard } from '@/context/DashboardContext'
import { AITutorPanel } from '@/components/dashboard/AITutorPanel'
import { LearningRoadmapPanel } from '@/components/dashboard/LearningRoadmapPanel'
import { cn } from '@/lib/utils'

export function RightPanel() {
  const location = useLocation()
  if (location.pathname.startsWith('/transcript')) return null

  return (
    <aside className="hidden xl:flex xl:w-[350px] xl:shrink-0 xl:sticky xl:top-0 xl:h-screen xl:flex-col xl:overflow-hidden xl:border-l xl:border-white/[0.08] xl:bg-background/80 xl:backdrop-blur-xl">
      {/* Right panel ambient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-ambient/[0.08] blur-[80px]" />
        <div className="absolute bottom-1/4 -left-16 h-40 w-40 rounded-full bg-accent/[0.05] blur-[70px]" />
      </div>

      <div className="relative flex flex-col gap-4 p-4 pt-[calc(3.5rem+1rem)] overflow-hidden">
        <AITutorPanel compact />
        <LearningRoadmapPanel />
      </div>
    </aside>
  )
}

export function MobileTutorOverlay() {
  const { tutorOpen, closeTutor } = useDashboard()

  return (
    <AnimatePresence>
      {tutorOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm xl:hidden"
          onClick={closeTutor}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/[0.08] bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <AITutorPanel />
            <button
              onClick={closeTutor}
              className={cn(
                'mt-4 w-full rounded-xl border border-white/[0.08] py-3 text-sm text-muted',
                'hover:text-foreground hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
              )}
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { aiSuggestions } from '@/config/dashboardNav'
