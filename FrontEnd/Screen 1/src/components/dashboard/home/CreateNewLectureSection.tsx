import { Sparkles } from 'lucide-react'
import { FadeUp } from '@/components/effects/FadeUp'
import { UploadSection } from '@/components/dashboard/home/UploadSection'

export function CreateNewLectureSection() {
  return (
    <FadeUp delay={0.1}>
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0a0a0a]/80 backdrop-blur-xl">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-accent/[0.04] via-transparent to-ambient/[0.04]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-20 right-1/4 h-48 w-48 rounded-full bg-accent/[0.06] blur-[90px]"
          aria-hidden
        />

        <div className="relative border-b border-white/[0.06] px-6 py-5 md:px-7">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/25 bg-accent/[0.1]">
              <Sparkles className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="font-heading text-xl text-foreground md:text-2xl">Create New Lecture</h2>
              <p className="mt-0.5 text-sm text-muted">
                Record live, upload files, import YouTube, or add a PDF.
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-6 py-5 md:px-7 md:py-6">
          <UploadSection hideTitle />
        </div>
      </section>
    </FadeUp>
  )
}
