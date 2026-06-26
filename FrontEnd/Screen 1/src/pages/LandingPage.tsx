import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroSection } from '@/sections/HeroSection'
import { WhyLecturePulseSection } from '@/sections/WhyLecturePulseSection'
import { AIChatSection } from '@/sections/AIChatSection'
import { ExamInsightsSection } from '@/sections/ExamInsightsSection'
import { ArchitectureSection } from '@/sections/ArchitectureSection'
import { EngineeringBlueprintSection } from '@/sections/EngineeringBlueprintSection'
import { FAQSection } from '@/sections/FAQSection'
import { CTASection } from '@/sections/CTASection'
import { useAuth } from '@/hooks/useAuth'

const AUTHED_LANDING_REDIRECT_MS = 1500

export function LandingPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading || !user) return

    const timer = window.setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, AUTHED_LANDING_REDIRECT_MS)

    return () => window.clearTimeout(timer)
  }, [user, loading, navigate])

  return (
    <main>
      <HeroSection />
      <WhyLecturePulseSection />
      <AIChatSection />
      <ExamInsightsSection />
      <ArchitectureSection />
      <EngineeringBlueprintSection />
      <FAQSection />
      <CTASection />
    </main>
  )
}
