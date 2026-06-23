import { motion, useReducedMotion } from 'framer-motion'
import { Section } from '@/components/layout/Section'
import { GlassCard } from '@/components/shared/GlassCard'
import { StatBlock } from '@/components/shared/StatBlock'
import { FadeUp } from '@/components/effects/FadeUp'

export function ExamInsightsSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <Section className="relative">
      <FadeUp>
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-3xl bg-red/[0.08] blur-3xl"
            animate={prefersReducedMotion ? {} : { opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <GlassCard className="relative p-8 md:p-12 border-red/15">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-red uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-red animate-pulse" />
                  Next Exam Focus
                </span>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mt-3 leading-[0.92]">
                  Multivariable Integration
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Based on your lectures, Stoke's Theorem will give the highest
                  score boost for your upcoming test.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <StatBlock value="94%" label="Confidence" className="[&>div:first-child]:text-accent" />
                <StatBlock value="12" label="Key Terms" />
                <StatBlock value="42 min" label="Review Time" />
                <StatBlock value="A+" label="Predicted" className="[&>div:first-child]:text-accent" />
              </div>
            </div>
          </GlassCard>
        </div>
      </FadeUp>
    </Section>
  )
}
