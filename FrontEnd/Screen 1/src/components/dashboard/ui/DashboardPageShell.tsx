import { cn } from '@/lib/utils'

/** Shared in-app page title sizing — use for utility pages, not marketing/landing. */
export const dashboardPageTitleClass =
  'font-heading text-2xl text-foreground md:text-3xl leading-tight tracking-tight'

/** Shared subtitle/description under in-app page titles. */
export const dashboardPageDescriptionClass =
  'mt-3 text-base text-muted leading-relaxed max-w-2xl'

interface DashboardPageShellProps {
  children: React.ReactNode
  className?: string
}

export function DashboardPageShell({ children, className }: DashboardPageShellProps) {
  return (
    <div className={cn('w-full max-w-[1680px] space-y-10', className)}>
      {children}
    </div>
  )
}

interface HighlightedPageTitleProps {
  title: string
  className?: string
}

export function HighlightedPageTitle({ title, className }: HighlightedPageTitleProps) {
  return (
    <span className={cn('text-gradient-pulse', className)}>
      {title}
    </span>
  )
}

interface DashboardPageHeaderProps {
  title: string
  description: string
  className?: string
}

export function DashboardPageHeader({ title, description, className }: DashboardPageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h1 className={dashboardPageTitleClass}>{title}</h1>
      <p className={dashboardPageDescriptionClass}>{description}</p>
    </div>
  )
}
