import { motion } from 'framer-motion'
import { useDashboard } from '@/context/DashboardContext'
import { PulseFabIcon } from '@/components/dashboard/ui/PulseFabIcon'

/** Mobile-only AI launcher — hidden on xl+ where the right panel is always visible. */
export function FloatingPulseAssistant() {
  const { openTutor } = useDashboard()

  return (
    <div className="hidden sm:block fixed bottom-7 right-7 z-50 xl:hidden">
      <motion.button
        type="button"
        onClick={() => openTutor()}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className="cursor-pointer rounded-full"
        aria-label="Open Ask AI"
      >
        <PulseFabIcon
          size={58}
          className="hover:border-accent/50 hover:shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.35),0_0_80px_rgba(var(--color-accent-rgb),0.15)]"
        />
      </motion.button>
    </div>
  )
}
