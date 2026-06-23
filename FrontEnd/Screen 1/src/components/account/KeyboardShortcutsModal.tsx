import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { keyboardShortcuts } from '@/config/keyboardShortcuts'
import { formatShortcutKeys } from '@/config/keyboardShortcuts'
import { useDashboard } from '@/context/DashboardContext'
import { cn } from '@/lib/utils'

export function KeyboardShortcutsModal() {
  const { shortcutsOpen, closeShortcuts } = useDashboard()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof keyboardShortcuts>()
    for (const shortcut of keyboardShortcuts) {
      const list = map.get(shortcut.category) ?? []
      list.push(shortcut)
      map.set(shortcut.category, list)
    }
    return Array.from(map.entries())
  }, [])

  return (
    <AnimatePresence>
      {shortcutsOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closeShortcuts}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'relative w-full max-w-lg rounded-2xl border border-white/[0.1] bg-card/95 p-6',
              'shadow-[0_0_48px_rgba(0,0,0,0.45)] backdrop-blur-xl',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeShortcuts}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="font-heading text-xl text-foreground">Keyboard shortcuts</h2>
            <p className="mt-1 text-sm text-muted">Quick actions across LecturePulse.</p>

            <div className="mt-6 max-h-[60vh] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
              {grouped.map(([category, shortcuts]) => (
                <div key={category}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {category}
                  </p>
                  <ul className="space-y-1">
                    {shortcuts.map((shortcut) => (
                      <li
                        key={shortcut.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                      >
                        <span className="text-sm text-foreground/90">{shortcut.action}</span>
                        <kbd className="shrink-0 rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-muted">
                          {formatShortcutKeys(shortcut.keys)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
