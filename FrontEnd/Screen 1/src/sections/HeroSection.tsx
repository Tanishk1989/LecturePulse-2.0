import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section } from '@/components/layout/Section'
import { SectionBadge } from '@/components/shared/SectionBadge'
import { LiveTranscriptCard } from '@/components/shared/LiveTranscriptCard'
import { Button } from '@/components/ui/button'
import { FadeUp } from '@/components/effects/FadeUp'
import { MagneticButton } from '@/components/effects/MagneticButton'
import { ParallaxGlow } from '@/components/effects/ParallaxGlow'
import { BackgroundDepth } from '@/components/effects/BackgroundDepth'
import { HeroWorkspace } from '@/sections/HeroWorkspace'

export function HeroSection() {
  return (
    <Section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 overflow-hidden">
      <ParallaxGlow variant="hero" />
      <BackgroundDepth variant="hero" />

      <div className="relative w-full max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <FadeUp>
              <SectionBadge>
                <span className="text-accent">✦</span> The Future of Learning
              </SectionBadge>
            </FadeUp>

            <FadeUp delay={0.1}>
              <h1 className="font-heading-hero text-5xl md:text-6xl lg:text-[4.25rem] xl:text-7xl mt-6 text-foreground">
                Turn lectures
                <br />
                into{' '}
                <em className="not-italic text-gradient-pulse">mastery.</em>
              </h1>
            </FadeUp>

            <FadeUp delay={0.2}>
              <p className="mt-6 text-lg text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                LecturePulse captures your lectures and transforms them into smart
                flashcards, concept maps, and exam predictions — automatically, in
                real time.
              </p>
            </FadeUp>

            <FadeUp delay={0.3}>
              <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <MagneticButton>
                  <Link to="/signup">
                    <Button variant="primary" size="lg" className="gap-2">
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </MagneticButton>
                <a href="#architecture" className="cursor-pointer">
                  <Button variant="secondary" size="lg">
                    Explore Architecture
                  </Button>
                </a>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={0.25} className="relative">
            <div className="absolute -inset-8 bg-accent/[0.06] blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -inset-4 bg-[#4F46E5]/[0.08] blur-2xl rounded-full pointer-events-none" />
            <LiveTranscriptCard className="relative max-w-md mx-auto lg:ml-auto lg:mr-0" />
          </FadeUp>
        </div>
      </div>

      <FadeUp delay={0.45} className="relative w-full mt-16 md:mt-20">
        <HeroWorkspace />
      </FadeUp>
    </Section>
  )
}
