import { Mic } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { FadeUp } from '@/components/effects/FadeUp'
import { BackgroundDepth } from '@/components/effects/BackgroundDepth'
import { AnimatedWaveform } from '@/components/shared/AnimatedWaveform'

const rows = [
  {
    title: 'Lectures move faster than you can write',
    description:
      'Professors cover a semester of material in fifty minutes. You scramble to jot notes while concepts fly past — and half the nuance is already gone.',
    illustration: 'overwhelmed',
    reverse: false,
  },
  {
    title: 'AI that understands your lectures',
    description:
      'LecturePulse captures lectures in real time and structures everything — definitions, formulas, key arguments — into clean, searchable notes you can actually study from.',
    illustration: 'notes',
    reverse: true,
  },
  {
    title: 'Flashcards that write themselves',
    description:
      'Every important concept becomes a flashcard automatically. FSRS schedules your reviews so you retain more with less cramming.',
    illustration: 'flashcards',
    reverse: false,
  },
  {
    title: 'Know exactly what to study',
    description:
      'The exam oracle analyzes lecture emphasis and historical patterns to predict high-yield topics — so you study smart, not just hard.',
    illustration: 'exam',
    reverse: true,
  },
]

function Illustration({ type }: { type: string }) {
  if (type === 'overwhelmed') {
    return (
      <div className="relative h-[320px] md:h-[400px] rounded-2xl overflow-hidden bg-card border border-white/[0.08] glow-hover cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-red/[0.08] to-[#4F46E5]/[0.06]" />
        <div className="absolute top-6 right-6 opacity-30">
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
            <path d="M24 4 L26 18 H42 L28 28 L32 44 L24 34 L16 44 L20 28 L6 18 H22 Z" stroke="var(--color-accent)" strokeWidth="0.5" fill="none" opacity="0.5" />
          </svg>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="floating-card rounded-xl p-5 w-full max-w-xs border-red/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-red" />
                <span className="text-[10px] font-semibold tracking-wider uppercase text-red">Live</span>
              </div>
              <span className="font-mono text-[10px] text-muted">00:14:32</span>
            </div>
            <AnimatedWaveform className="mb-4" height={28} />
            <p className="text-xs text-foreground">"...and the derivative approaches..."</p>
            <p className="text-xs text-muted mt-1">"...faster than you can write..."</p>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'notes') {
    return (
      <div className="relative h-[320px] md:h-[400px] rounded-2xl overflow-hidden bg-card border border-white/[0.08] glow-hover cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/[0.1] to-transparent" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-accent/[0.06] blur-2xl" />
        <div className="p-6 md:p-8 h-full flex flex-col">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest uppercase text-accent mb-4">
            <Mic className="h-3.5 w-3.5" />
            AI Generated Notes
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <h4 className="text-sm font-medium text-foreground">Eigenvalues & Eigenvectors</h4>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                For matrix A, eigenvalue λ satisfies det(A − λI) = 0. The corresponding
                eigenvector v satisfies Av = λv.
              </p>
            </div>
            <div className="glass-card rounded-lg p-3">
              <code className="text-xs text-accent">λ₁ = 3.14, λ₂ = -1.72</code>
            </div>
            <div className="space-y-2">
              {['Diagonalization', 'Spectral theorem', 'Orthogonality'].map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent" />
                  <span className="text-xs text-muted">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'flashcards') {
    return (
      <div className="relative h-[320px] md:h-[400px] rounded-2xl overflow-hidden bg-card border border-white/[0.08] glow-hover cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] to-transparent" />
        <div className="absolute top-8 left-8 opacity-20">
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden>
            <rect x="8" y="8" width="24" height="24" rx="4" stroke="var(--color-accent)" strokeWidth="0.5" fill="none" transform="rotate(12 20 20)" />
            <rect x="12" y="4" width="24" height="24" rx="4" stroke="var(--color-accent)" strokeWidth="0.5" fill="none" transform="rotate(-8 24 16)" />
          </svg>
        </div>
        <div className="p-6 md:p-8 h-full flex items-center justify-center">
          <div className="relative w-full max-w-sm">
            <div className="floating-card rounded-xl p-6 transform -rotate-2 absolute top-0 left-4 right-4 opacity-40">
              <p className="text-xs text-muted">What is a limit?</p>
            </div>
            <div className="floating-card rounded-xl p-6 transform rotate-1 relative z-10 border-accent/20 shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.1)]">
              <p className="text-[10px] uppercase tracking-wider text-accent mb-3">Flashcard</p>
              <p className="text-sm font-medium text-foreground">Define eigenvalue</p>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-muted">
                  A scalar λ such that Av = λv for some non-zero vector v.
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-[10px] px-2 py-1 rounded bg-red/10 text-red border border-red/20">
                  Due today
                </span>
                <span className="text-[10px] px-2 py-1 rounded bg-white/[0.05] text-muted">
                  FSRS · 4d interval
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-[320px] md:h-[400px] rounded-2xl overflow-hidden bg-card border border-red/20 glow-hover cursor-pointer">
      <div className="absolute inset-0 bg-gradient-to-br from-red/[0.1] to-[#4F46E5]/[0.08]" />
      <div className="p-6 md:p-8 h-full flex flex-col justify-center">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-red mb-3">
          Exam Oracle
        </span>
        <h4 className="font-heading text-2xl md:text-3xl text-foreground">
          Multivariable Integration
        </h4>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Stoke's Theorem — highest score boost for your upcoming test.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { v: '94%', l: 'Confidence' },
            { v: '12', l: 'Key Terms' },
            { v: '42m', l: 'Review' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-heading text-xl text-accent">{s.v}</div>
              <div className="text-[10px] text-muted uppercase tracking-wider mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function WhyLecturePulseSection() {
  return (
    <Section id="why" className="relative overflow-hidden">
      <BackgroundDepth variant="section" />

      <FadeUp>
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-foreground leading-[0.92]">
            Why LecturePulse
          </h2>
          <p className="mt-5 text-muted text-lg">
            Learning shouldn't feel like drowning. We built the tool we wished existed.
          </p>
        </div>
      </FadeUp>

      <div className="space-y-24 md:space-y-32">
        {rows.map((row, i) => (
          <FadeUp key={row.title} delay={i * 0.1}>
            <div
              className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                row.reverse ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <Illustration type={row.illustration} />
              <div className={row.reverse ? 'lg:pr-8' : 'lg:pl-8'}>
                <span className="text-xs font-medium tracking-widest text-muted uppercase">
                  0{i + 1}
                </span>
                <h3 className="font-heading text-3xl md:text-4xl text-foreground mt-3 leading-[0.92]">
                  {row.title}
                </h3>
                <p className="mt-5 text-muted text-lg leading-relaxed">{row.description}</p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </Section>
  )
}
