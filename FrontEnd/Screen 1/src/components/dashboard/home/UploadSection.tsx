import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FadeUp } from '@/components/effects/FadeUp'
import { uploadActions, NAV_ICON_STROKE } from '@/config/dashboardNav'
import { YouTubeIconHero, YouTubeReadyBadge } from '@/components/dashboard/home/YouTubeImportCard'
import { cn } from '@/lib/utils'

type GlowVariant = 'red' | 'gold' | 'indigo' | 'emerald'

const cardMeta: Record<
  string,
  { subtitle: string; badge: string; dotClass: string; glow: GlowVariant }
> = {
  record: {
    subtitle: 'Capture lectures in real time.',
    badge: 'Ready',
    dotClass: 'bg-red shadow-[0_0_6px_rgba(239,68,68,0.6)]',
    glow: 'red',
  },
  upload: {
    subtitle: 'Audio or video files.',
    badge: 'Drag & Drop',
    dotClass: 'bg-accent shadow-[0_0_6px_rgba(var(--color-accent-rgb),0.6)]',
    glow: 'gold',
  },
  youtube: {
    subtitle: 'Import educational videos.',
    badge: 'YouTube Ready',
    dotClass: 'bg-[#FF3B30]',
    glow: 'red',
  },
  pdf: {
    subtitle: 'Convert notes into study material.',
    badge: 'AI Ready',
    dotClass: 'bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.6)]',
    glow: 'emerald',
  },
}

const glowStyles: Record<GlowVariant, { outer: string; icon: string; hover: string }> = {
  red: {
    outer: 'bg-red/[0.12]',
    icon: 'border-red/25 bg-red/[0.08] text-red shadow-[0_0_24px_rgba(239,68,68,0.15)]',
    hover: 'group-hover:shadow-[0_0_48px_rgba(239,68,68,0.12)] group-hover:border-red/30',
  },
  gold: {
    outer: 'bg-accent/[0.12]',
    icon: 'border-accent/25 bg-accent/[0.08] text-accent shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.15)]',
    hover: 'group-hover:shadow-[0_0_48px_rgba(var(--color-accent-rgb),0.14)] group-hover:border-accent/30',
  },
  indigo: {
    outer: 'bg-ambient/[0.12]',
    icon: 'border-ambient/25 bg-ambient/[0.08] text-ambient shadow-[0_0_24px_rgba(79,70,229,0.15)]',
    hover: 'group-hover:shadow-[0_0_48px_rgba(79,70,229,0.12)] group-hover:border-ambient/30',
  },
  emerald: {
    outer: 'bg-emerald/[0.12]',
    icon: 'border-emerald/25 bg-emerald/[0.08] text-emerald shadow-[0_0_24px_rgba(16,185,129,0.15)]',
    hover: 'group-hover:shadow-[0_0_48px_rgba(16,185,129,0.12)] group-hover:border-emerald/30',
  },
}

function StatusBadge({ label, dotClass }: { label: string; dotClass: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-muted">
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
      {label}
    </span>
  )
}

function YouTubeCard({ path }: { path: string }) {
  const [hovered, setHovered] = useState(false)
  const meta = cardMeta.youtube

  return (
    <Link
      to={path}
      className="group block h-full cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-[230px]">
        <motion.div
          className="absolute -inset-4 rounded-3xl bg-[#FF3B30]/15 blur-3xl pointer-events-none"
          animate={{ opacity: hovered ? 0.75 : 0.35 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />

        <motion.div
          className={cn(
            'relative flex h-full flex-col rounded-2xl border border-red-500/20',
            'bg-[#0A0A0A]/95 backdrop-blur-xl p-6 overflow-hidden',
            'shadow-[0_0_40px_rgba(255,59,48,0.12)]',
          )}
          animate={{
            y: hovered ? -6 : 0,
            borderColor: hovered ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)',
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,59,48,0.12),transparent_65%)] pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0.4 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          <YouTubeIconHero isHovered={hovered} />

          <div className="relative flex flex-1 flex-col items-center justify-center text-center px-1 py-3">
            <p className="text-lg font-semibold text-foreground">Import YouTube</p>
            <p className="mt-2 text-sm text-muted leading-relaxed">{meta.subtitle}</p>
          </div>

          <div className="relative flex justify-center pb-1">
            <YouTubeReadyBadge />
          </div>
        </motion.div>
      </div>
    </Link>
  )
}

function StandardCreateCard({
  action,
  meta,
  glow,
}: {
  action: (typeof uploadActions)[0]
  meta: (typeof cardMeta)[string]
  glow: (typeof glowStyles)[GlowVariant]
}) {
  const Icon = action.icon

  return (
    <Link to={action.path} className="group block h-full cursor-pointer">
      <div className="relative h-[230px]">
        <div
          className={cn(
            'absolute -inset-3 rounded-3xl blur-2xl opacity-40 transition-opacity duration-300',
            'group-hover:opacity-70',
            glow.outer,
          )}
          aria-hidden
        />

        <div
          className={cn(
            'relative flex h-full flex-col rounded-2xl border border-white/[0.08]',
            'bg-[#0d0d0d]/90 backdrop-blur-xl p-6',
            'transition-all duration-300',
            'hover:-translate-y-1.5 hover:border-accent/25 hover:scale-[1.03]',
            glow.hover,
          )}
        >
          <div className="flex justify-center pt-1">
            <div
              className={cn(
                'flex h-[72px] w-[72px] items-center justify-center rounded-2xl border backdrop-blur-md',
                'transition-transform duration-300 group-hover:scale-105',
                glow.icon,
              )}
            >
              <Icon size={30} strokeWidth={NAV_ICON_STROKE} />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center px-1 py-4">
            <p className="text-lg font-semibold text-foreground">{action.label}</p>
            <p className="mt-2 text-sm text-muted leading-relaxed">{meta.subtitle}</p>
          </div>

          <div className="flex justify-center pb-1">
            <StatusBadge label={meta.badge} dotClass={meta.dotClass} />
          </div>
        </div>
      </div>
    </Link>
  )
}

export function UploadSection({ hideTitle = false }: { hideTitle?: boolean } = {}) {
  return (
    <FadeUp delay={0.18}>
      <div>
        {!hideTitle && (
          <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-4">Create</h2>
        )}
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {uploadActions.map((action, index) => {
            const meta = cardMeta[action.id]
            const glow = glowStyles[meta.glow]

            return (
              <FadeUp key={action.id} delay={0.2 + index * 0.04}>
                {action.id === 'youtube' ? (
                  <YouTubeCard path={action.path} />
                ) : (
                  <StandardCreateCard action={action} meta={meta} glow={glow} />
                )}
              </FadeUp>
            )
          })}
        </div>
      </div>
    </FadeUp>
  )
}
