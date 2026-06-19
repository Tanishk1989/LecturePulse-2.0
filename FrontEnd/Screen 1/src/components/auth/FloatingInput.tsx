import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function FloatingInput({ label, className, id, onFocus, onBlur, onChange, ...props }: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const [focused, setFocused] = useState(false)
  const [filled, setFilled] = useState(false)

  return (
    <div className="relative">
      <input
        id={inputId}
        className={cn(
          'peer h-12 w-full rounded-xl border border-white/[0.08] bg-[#0A0A0A]/80 px-4 pt-5 pb-2 text-sm text-foreground',
          'transition-all duration-300 ease-out outline-none',
          'focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(214,162,11,0.12)]',
          'placeholder:text-transparent',
          className,
        )}
        placeholder={label}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          setFilled(e.target.value.length > 0)
          onBlur?.(e)
        }}
        onChange={(e) => {
          setFilled(e.target.value.length > 0)
          onChange?.(e)
        }}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'pointer-events-none absolute left-4 text-muted transition-all duration-300 ease-out',
          focused || filled
            ? 'top-2 text-[10px] font-medium tracking-wide text-accent/80'
            : 'top-1/2 -translate-y-1/2 text-sm',
        )}
      >
        {label}
      </label>
    </div>
  )
}
