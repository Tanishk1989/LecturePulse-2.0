import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'red'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'btn-premium inline-flex items-center justify-center font-medium rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          {
            'bg-accent text-background hover:bg-accent-soft shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.15)] hover:shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.2)]':
              variant === 'primary',
            'bg-transparent border border-white/[0.08] text-foreground hover:bg-white/[0.05] hover:border-white/[0.15] hover:shadow-[0_0_24px_rgba(255,255,255,0.06)]':
              variant === 'secondary',
            'bg-transparent text-muted hover:text-foreground': variant === 'ghost',
            'bg-red/10 border border-red/20 text-red hover:bg-red/20 hover:shadow-[0_0_24px_rgba(239,68,68,0.15)]':
              variant === 'red',
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-6 text-sm': size === 'md',
            'h-12 px-8 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
