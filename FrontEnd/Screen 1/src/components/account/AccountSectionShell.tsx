import { type ReactNode } from 'react'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { cn } from '@/lib/utils'

export interface AccountSectionItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

interface AccountSectionShellProps {
  title: string
  description: string
  sections: AccountSectionItem[]
  activeSection: string
  onSectionChange: (id: string) => void
  children: ReactNode
}

export function AccountSectionShell({
  title,
  description,
  sections,
  activeSection,
  onSectionChange,
  children,
}: AccountSectionShellProps) {
  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader title={title} description={description} />
      </FadeUp>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
        <FadeUp delay={0.06}>
          <nav
            className={cn(
              'rounded-2xl border border-white/[0.08] bg-card/60 p-3 backdrop-blur-xl',
              'xl:sticky xl:top-24 xl:self-start',
            )}
          >
            <ul className="space-y-0.5">
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(section.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all cursor-pointer',
                        isActive
                          ? 'bg-accent/[0.12] text-accent border-l-2 border-accent pl-[10px]'
                          : 'text-muted hover:text-foreground hover:bg-white/[0.03] border-l-2 border-transparent',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className={cn(isActive && 'font-medium')}>{section.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div
            className={cn(
              'rounded-2xl border border-white/[0.08] bg-card/80 p-6 md:p-8 backdrop-blur-xl',
              'min-h-[480px]',
            )}
          >
            {children}
          </div>
        </FadeUp>
      </div>
    </DashboardPageShell>
  )
}
