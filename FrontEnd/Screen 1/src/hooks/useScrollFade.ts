import { useState, useEffect, useRef } from 'react'

export function useScrollFade(externalRef?: React.RefObject<HTMLDivElement | null>) {
  const localRef = useRef<HTMLDivElement>(null)
  const containerRef = externalRef || localRef
  const [showTopFade, setShowTopFade] = useState(false)
  const [showBottomFade, setShowBottomFade] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      setShowTopFade(scrollTop > 5)
      // Check if user has more to scroll (with 5px buffer)
      setShowBottomFade(scrollTop + clientHeight < scrollHeight - 5)
    }

    // Run initially
    handleScroll()

    container.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    // Monitor changes to children/inner height
    const resizeObserver = new ResizeObserver(() => {
      handleScroll()
    })
    resizeObserver.observe(container)

    // Extra fallback check after a short delay to handle late renders
    const timer = setTimeout(handleScroll, 100)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      resizeObserver.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return { containerRef, showTopFade, showBottomFade }
}
