import { cn } from '@/lib/utils'

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

interface DashboardPageHeaderProps {
  title: string
  description: string
  className?: string
}

export function DashboardPageHeader({ title, description, className }: DashboardPageHeaderProps) {
  return (
    <div className={cn('mb-2', className)}>
      <h1 className="font-heading text-5xl md:text-6xl text-foreground">{title}</h1>
      <p className="mt-4 text-xl text-muted leading-relaxed max-w-2xl mx-auto">{description}</p>
    </div>
  )
}
