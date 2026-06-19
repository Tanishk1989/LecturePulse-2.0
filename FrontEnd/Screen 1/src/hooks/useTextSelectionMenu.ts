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
    if (!text) {
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
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('keyup', handleSelection)

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      setSelection(null)
    }

    document.addEventListener('mousedown', onMouseDown)

    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('keyup', handleSelection)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [containerRef, handleSelection])

  return { selection, clearSelection }
}
