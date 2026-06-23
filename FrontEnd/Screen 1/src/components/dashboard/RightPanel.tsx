import { AnimatePresence, motion } from 'framer-motion'
import { useDashboard } from '@/context/DashboardContext'
import { AITutorPanel } from '@/components/dashboard/AITutorPanel'
import { QuickActionsRail } from '@/components/dashboard/QuickActionsRail'
import { AI_PANEL_EXPANDED_WIDTH_PX } from '@/lib/breakpoints'
import { cn } from '@/lib/utils'

const PANEL_TRANSITION = { duration: 0.22, ease: [0, 0, 0.2, 1] as const }

export function RightPanel() {
  const { tutorPanelExpanded, expandTutorPanel, collapseTutorPanel } = useDashboard()

  return (
    <>
      {!tutorPanelExpanded && (
        <QuickActionsRail onExpandTutor={expandTutorPanel} />
      )}

      <AnimatePresence>
        {tutorPanelExpanded && (
          <>
            <motion.button
              type="button"
              key="ai-panel-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={PANEL_TRANSITION}
              aria-label="Close Ask AI panel"
              className="fixed inset-0 z-40 hidden bg-black/45 backdrop-blur-[2px] xl:block cursor-pointer"
              onClick={collapseTutorPanel}
            />

            <motion.aside
              key="ai-panel-expanded"
              role="dialog"
              aria-label="Ask AI"
              initial={{ x: AI_PANEL_EXPANDED_WIDTH_PX }}
              animate={{ x: 0 }}
              exit={{ x: AI_PANEL_EXPANDED_WIDTH_PX }}
              transition={PANEL_TRANSITION}
              className={cn(
                'fixed right-0 top-14 bottom-0 z-50 hidden xl:flex flex-col overflow-hidden',
                'border-l border-white/[0.08] bg-background/95 backdrop-blur-xl',
                'shadow-[-8px_0_40px_rgba(0,0,0,0.35)]',
              )}
              style={{ width: AI_PANEL_EXPANDED_WIDTH_PX }}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute -top-20 right-0 h-48 w-48 rounded-full bg-ambient/[0.08] blur-[80px]" />
                <div className="absolute bottom-1/4 -left-16 h-40 w-40 rounded-full bg-accent/[0.05] blur-[70px]" />
              </div>

              <div className="relative flex flex-1 flex-col gap-4 overflow-hidden p-4 h-full">
                <AITutorPanel
                  compact
                  registerFocus
                  showCollapseButton
                  className="flex-1 min-h-0"
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
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
            <AITutorPanel registerFocus={false} />
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
