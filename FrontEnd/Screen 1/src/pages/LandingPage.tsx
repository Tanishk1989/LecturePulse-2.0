import { HeroSection } from '@/sections/HeroSection'
import { WhyLecturePulseSection } from '@/sections/WhyLecturePulseSection'
import { KnowledgeGraphSection } from '@/sections/KnowledgeGraphSection'
import { AIChatSection } from '@/sections/AIChatSection'
import { ExamInsightsSection } from '@/sections/ExamInsightsSection'
import { ArchitectureSection } from '@/sections/ArchitectureSection'
import { EngineeringBlueprintSection } from '@/sections/EngineeringBlueprintSection'
import { FAQSection } from '@/sections/FAQSection'
import { CTASection } from '@/sections/CTASection'

export function LandingPage() {
  return (
    <main>
      <HeroSection />
      <WhyLecturePulseSection />
      <KnowledgeGraphSection />
      <AIChatSection />
      <ExamInsightsSection />
      <ArchitectureSection />
      <EngineeringBlueprintSection />
      <FAQSection />
      <CTASection />
    </main>
  )
}
