import { Star } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { LectureCard } from '@/components/lectures/LectureCard'
import type { LectureRecording } from '@/types/lecture'

interface LectureSectionProps {
  title: string
  icon?: 'star'
  lectures: LectureRecording[]
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onToggleFavorite: (id: string) => void
}

export function LectureSection({
  title,
  icon,
  lectures,
  onDelete,
  onRename,
  onToggleFavorite,
}: LectureSectionProps) {
  if (lectures.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {icon === 'star' && <Star className="h-4 w-4 text-accent fill-accent/30" />}
        <h2 className="text-sm font-semibold tracking-[0.18em] uppercase text-muted text-left">{title}</h2>
      </div>

      <div className="divide-y divide-white/[0.05] rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/90 overflow-hidden backdrop-blur-xl shadow-xl">
        <AnimatePresence mode="popLayout">
          {lectures.map((lecture) => (
            <LectureCard
              key={lecture.id}
              lecture={lecture}
              onDelete={onDelete}
              onRename={onRename}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
