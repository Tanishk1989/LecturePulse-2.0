import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Layers, Rocket, Sparkles } from 'lucide-react'
import { roadmapStages } from '@/config/dashboardNav'
import { cn } from '@/lib/utils'

const stageMeta = [
  { icon: BookOpen, subtitle: 'Build your base knowledge', color: 'text-accent' },
  { icon: Layers, subtitle: 'Master key topics', color: 'text-emerald' },
  { icon: Sparkles, subtitle: 'Deep dive into complexity', color: 'text-ambient' },
  { icon: Rocket, subtitle: 'Achieve full mastery', color: 'text-accent' },
]

export function LearningRoadmapPanel() {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-card/90 backdrop-blur-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald/[0.03] to-transparent pointer-events-none" />

      <div className="relative flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
        <Layers className="h-4 w-4 text-emerald" strokeWidth={1.75} />
        <h3 className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted">
          Learning Roadmap
        </h3>
      </div>

      <div className="relative p-4">
        <div className="relative space-y-0">
          {roadmapStages.map((stage, index) => {
            const meta = stageMeta[index] ?? stageMeta[0]
            const Icon = meta.icon

            return (
              <div key={stage.id} className="relative flex items-center gap-3 py-3.5">
                {index < roadmapStages.length - 1 && (
                  <div className="absolute left-[15px] top-[38px] bottom-0 w-px border-l border-dashed border-white/[0.1]" />
                )}

                <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <Icon className={cn('h-3.5 w-3.5', meta.color)} strokeWidth={1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{stage.label}</p>
                  <p className="text-[11px] text-muted truncate">{meta.subtitle}</p>
                </div>

                <span className="shrink-0 text-xs font-medium text-muted tabular-nums">0%</span>
              </div>
            )
          })}
        </div>

        <Link
          to="/dashboard/roadmap"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-soft transition-colors duration-300 cursor-pointer group/link"
        >
          View full roadmap
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
