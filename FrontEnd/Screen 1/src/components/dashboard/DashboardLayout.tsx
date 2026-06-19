import { Outlet } from 'react-router-dom'
import { DashboardProvider } from '@/context/DashboardContext'
import { LectureProvider } from '@/hooks/useLectures'
import { Sidebar, MobileSidebarDrawer } from '@/components/dashboard/Sidebar'
import { TopNavbar } from '@/components/dashboard/TopNavbar'
import { RightPanel, MobileTutorOverlay } from '@/components/dashboard/RightPanel'
import { FloatingPulseAssistant } from '@/components/dashboard/FloatingPulseAssistant'

export function DashboardLayout() {
  return (
    <DashboardProvider>
      <LectureProvider>
        <div className="min-h-screen bg-background text-foreground relative">
          <div className="pointer-events-none fixed inset-0 bg-noise opacity-[0.03] z-0" aria-hidden />
          <div
            className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-ambient/[0.04] blur-[160px] z-0"
            aria-hidden
          />

          <div className="relative z-10 flex">
            <Sidebar />
            <MobileSidebarDrawer />

            <div className="flex flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <TopNavbar />
                <main className="relative px-5 py-7 lg:px-8 lg:py-9 pb-32">
                  <Outlet />
                </main>
              </div>

              <RightPanel />
            </div>

            <MobileTutorOverlay />
            <FloatingPulseAssistant />
          </div>
        </div>
      </LectureProvider>
    </DashboardProvider>
  )
}
