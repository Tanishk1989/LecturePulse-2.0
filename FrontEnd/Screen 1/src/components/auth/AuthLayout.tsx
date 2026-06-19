import { type ReactNode } from 'react'
import { ParticleField } from '@/components/effects/ParticleField'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#050505] text-foreground overflow-hidden">
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-[0.06] z-0" aria-hidden />
      <div
        className="pointer-events-none fixed top-[-10%] left-[-5%] h-[500px] w-[600px] rounded-full bg-[#4F46E5]/[0.12] blur-[140px] z-0"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-[-15%] right-[-5%] h-[450px] w-[550px] rounded-full bg-accent/[0.1] blur-[120px] z-0"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed top-1/2 left-1/3 h-[300px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[100px] z-0"
        aria-hidden
      />
      <ParticleField count={35} yellowRatio={0.1} className="fixed inset-0 z-0 opacity-60" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <div className="lg:w-[60%]">
          <AuthBrandPanel />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:w-[40%] lg:px-10 lg:py-16">
          {children}
        </div>
      </div>
    </div>
  )
}
