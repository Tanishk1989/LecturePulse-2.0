import React, { forwardRef } from 'react'
import { useScrollFade } from '@/hooks/useScrollFade'
import { cn } from '@/lib/utils'

interface ScrollFadeContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  fadeColor?: string // CSS variable, e.g. "var(--background)" or "var(--card)"
  fadeHeight?: string // e.g. "h-6" or "h-[24px]"
}

export const ScrollFadeContainer = forwardRef<HTMLDivElement, ScrollFadeContainerProps>(
  ({ children, fadeColor = 'var(--background)', fadeHeight = 'h-6', className, ...props }, ref) => {
    const externalRef = ref as React.RefObject<HTMLDivElement | null>
    const { containerRef, showTopFade, showBottomFade } = useScrollFade(externalRef)

    return (
      <div className="relative flex flex-col min-h-0 w-full overflow-visible">
        {/* Top Fade */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 z-20 pointer-events-none transition-opacity duration-300',
            fadeHeight,
            showTopFade ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: `linear-gradient(to bottom, ${fadeColor}, transparent)`
          }}
        />

        {/* Scrollable Area */}
        <div
          ref={containerRef}
          className={cn('overflow-y-auto w-full h-full min-h-0', className)}
          {...props}
        >
          {children}
        </div>

        {/* Bottom Fade */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20 pointer-events-none transition-opacity duration-300',
            fadeHeight,
            showBottomFade ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            background: `linear-gradient(to top, ${fadeColor}, transparent)`
          }}
        />
      </div>
    )
  }
)

ScrollFadeContainer.displayName = 'ScrollFadeContainer'
export default ScrollFadeContainer
