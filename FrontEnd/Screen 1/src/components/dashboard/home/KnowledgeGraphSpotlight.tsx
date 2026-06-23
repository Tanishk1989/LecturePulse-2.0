import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLectures } from '@/hooks/useLectures'
import { useUserNotes } from '@/hooks/useUserNotes'
import { useAuthContext } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

export function KnowledgeGraphSpotlight() {
  const { user } = useAuthContext()
  const { lectures, loading: lecturesLoading } = useLectures()
  const { notes, loading: notesLoading } = useUserNotes()
  const [dismissed, setDismissed] = useState(true) // Hidden by default
  const [checking, setChecking] = useState(true)

  const N = notes.reduce((acc, note) => acc + (note.content?.keyConcepts?.length || 0), 0)
  const M = notes.filter((note) => note.status === 'completed').length

  const storageKey = user ? `lecturepulse:kg_spotlight_seen:${user.uid}` : null

  useEffect(() => {
    if (lecturesLoading || notesLoading || !user || !storageKey) return

    const seen = localStorage.getItem(storageKey) === 'true'
    const hasEnoughLectures = lectures.length >= 2
    const hasEnoughConcepts = N >= 3

    if (!seen && hasEnoughLectures && hasEnoughConcepts) {
      setDismissed(false)
    }
    setChecking(false)
  }, [lecturesLoading, notesLoading, user, lectures.length, N, storageKey])

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      localStorage.setItem(storageKey, 'true')
    }
  }

  if (checking || dismissed) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative rounded-3xl border border-border bg-card/60 p-5 md:p-6 backdrop-blur-xl group overflow-hidden shadow-premium',
        )}
      >
        {/* NEW Badge Pill */}
        <div className="absolute -top-1 left-6 z-20 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-background shadow-[0_0_12px_rgba(var(--color-accent-rgb),0.25)]">
          New
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 text-muted hover:text-foreground cursor-pointer transition-colors p-1 z-20"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 pt-2 md:pt-1">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-heading text-lg text-foreground font-semibold leading-tight">
                Your first knowledge graph is ready
              </h3>
            </div>
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              We mapped {N} concepts from your last {M} lectures. See what you actually know — and what needs work.
            </p>
          </div>

          <Link
            to="/dashboard/knowledge-graph"
            onClick={handleDismiss}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-background hover:bg-accent-soft transition-all cursor-pointer shadow-[0_0_16px_rgba(var(--color-accent-rgb),0.15)]"
          >
            Explore my graph
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
