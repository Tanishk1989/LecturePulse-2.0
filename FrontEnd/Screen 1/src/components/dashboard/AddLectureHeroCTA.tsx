import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { uploadActions } from '@/config/dashboardNav'
import { cn } from '@/lib/utils'

interface AddLectureHeroCTAProps {
  className?: string
}

export function AddLectureHeroCTA({ className }: AddLectureHeroCTAProps) {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateCoords()
    setOpen((prev) => !prev)
  }

  useEffect(() => {
    if (!open) return

    updateCoords()
    window.addEventListener('resize', updateCoords)
    window.addEventListener('scroll', updateCoords, { passive: true })

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const clickedInsideDropdown = dropdownRef.current?.contains(target)
      const clickedInsideButton = containerRef.current?.contains(target)
      if (!clickedInsideDropdown && !clickedInsideButton) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const breatheDuration = hovered ? 1.4 : 3
  const pulseDuration = hovered ? 1.1 : 2.2

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div ref={containerRef} className="relative flex flex-col items-center">
        <div className="relative">
          {/* Ambient glow behind CTA */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: 'var(--accent)' }}
            animate={
              prefersReducedMotion
                ? { opacity: 0.15, scale: 1 }
                : { opacity: hovered ? [0.25, 0.4, 0.25] : [0.12, 0.25, 0.12], scale: hovered ? [1, 1.08, 1] : [1, 1.04, 1] }
            }
            transition={{ duration: pulseDuration, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.button
            type="button"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={handleToggle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            animate={prefersReducedMotion ? {} : { scale: [1, 1.02, 1] }}
            transition={{ duration: breatheDuration, repeat: Infinity, ease: 'easeInOut' }}
            whileHover={prefersReducedMotion ? {} : { scale: 1.04 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            className={cn(
              'add-lecture-cta-button relative z-10 flex h-[68px] min-w-[280px] items-center justify-center gap-2.5 rounded-full px-10',
              'cursor-pointer text-[17px] font-semibold tracking-tight',
              'transition-shadow duration-300',
              hovered && 'add-lecture-cta-button--hovered',
            )}
          >
            <Plus className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            Add Lecture
          </motion.button>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={dropdownRef}
              role="menu"
              initial={{ opacity: 0, y: 15, scale: 0.95, x: '-50%' }}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
              exit={{ opacity: 0, y: 10, scale: 0.97, x: '-50%' }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'absolute',
                top: `${coords.top + 12}px`,
                left: `${coords.left + coords.width / 2}px`,
              }}
              className="add-lecture-cta-menu z-[9999] w-[min(100vw-2rem,360px)] overflow-hidden rounded-[20px] p-2"
            >
              <div className="space-y-1">
                {uploadActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + index * 0.05, duration: 0.2 }}
                    onClick={() => {
                      setOpen(false)
                      navigate(action.path)
                    }}
                    className="add-lecture-cta-menu-item group flex w-full items-center gap-4 rounded-2xl px-3 py-3.5 text-left cursor-pointer"
                  >
                    <span className="add-lecture-cta-menu-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                      <action.icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white">{action.label}</span>
                      <span className="mt-0.5 block text-xs text-white/55 leading-snug">
                        {action.description}
                      </span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <p className="mt-4 max-w-xs text-sm text-muted leading-relaxed">
        Record, upload or import your learning in seconds
      </p>
    </div>
  )
}
