import { useCallback, useEffect, useState, type RefObject } from 'react'

export interface TextSelectionState {
  text: string
  rect: DOMRect
}

export function useTextSelectionMenu(containerRef: RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null)

  const clearSelection = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  const handleSelection = useCallback(() => {
    const container = containerRef.current
    const nativeSelection = window.getSelection()

    if (!container || !nativeSelection || nativeSelection.isCollapsed) {
      setSelection(null)
      return
    }

    const text = nativeSelection.toString().trim()
    if (!text || text.length < 2) {
      setSelection(null)
      return
    }

    const range = nativeSelection.getRangeAt(0)
    const common = range.commonAncestorContainer

    if (!container.contains(common)) {
      setSelection(null)
      return
    }

    const rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      setSelection(null)
      return
    }

    setSelection({ text, rect })
  }, [containerRef])

  useEffect(() => {
    const onMouseUp = () => {
      requestAnimationFrame(handleSelection)
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchend', onMouseUp)
    document.addEventListener('keyup', handleSelection)

    const onScroll = () => setSelection(null)
    window.addEventListener('scroll', onScroll, true)

    const onMouseDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('[data-transcript-toolbar]')) return
      if (containerRef.current?.contains(target)) return
      setSelection(null)
    }

    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('touchstart', onMouseDown)

    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchend', onMouseUp)
      document.removeEventListener('keyup', handleSelection)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('touchstart', onMouseDown)
    }
  }, [containerRef, handleSelection])

  return { selection, clearSelection }
}
