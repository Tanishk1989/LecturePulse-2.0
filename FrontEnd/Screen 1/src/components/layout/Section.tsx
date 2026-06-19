import { cn } from '@/lib/utils'

interface SectionProps {
  children: React.ReactNode
  id?: string
  className?: string
}

export function Section({ children, id, className }: SectionProps) {
  return (
    <section id={id} className={cn('relative py-24 md:py-32', className)}>
      <div className="mx-auto max-w-6xl px-6">{children}</div>
    </section>
  )
}
