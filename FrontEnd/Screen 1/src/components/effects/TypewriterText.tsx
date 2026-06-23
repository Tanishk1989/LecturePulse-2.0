import { useEffect, useState, useRef } from 'react'

const animatedIds = new Set<string>()

export function resetTypewriterSession() {
  animatedIds.clear()
}

export function useTypewriter(blocks: string[], contentId: string) {
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  const shouldSkipAnimation = prefersReducedMotion || animatedIds.has(contentId)

  const [currentBlockIndex, setCurrentBlockIndex] = useState(shouldSkipAnimation ? blocks.length : 0)
  const [currentText, setCurrentText] = useState(shouldSkipAnimation && blocks.length > 0 ? blocks[blocks.length - 1] : '')
  const [isComplete, setIsComplete] = useState(shouldSkipAnimation)
  const [skipped, setSkipped] = useState(false)

  const timerRef = useRef<any>(null)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks

  const skip = () => {
    if (isComplete) return
    setSkipped(true)
    setIsComplete(true)
    const currentBlocks = blocksRef.current
    setCurrentBlockIndex(currentBlocks.length)
    setCurrentText(currentBlocks[currentBlocks.length - 1] || '')
    animatedIds.add(contentId)
  }

  useEffect(() => {
    if (shouldSkipAnimation) return

    // Reset only if contentId changes
    setCurrentBlockIndex(0)
    setCurrentText('')
    setIsComplete(false)
    setSkipped(false)
  }, [contentId, shouldSkipAnimation])

  useEffect(() => {
    if (shouldSkipAnimation || isComplete || skipped) return
    const currentBlocks = blocksRef.current
    if (currentBlocks.length === 0) {
      setIsComplete(true)
      return
    }

    let blockIdx = currentBlockIndex
    if (blockIdx >= currentBlocks.length) {
      setIsComplete(true)
      animatedIds.add(contentId)
      return
    }

    const fullText = currentBlocks[blockIdx]
    let charIdx = currentText.length

    const typeChar = () => {
      if (charIdx < fullText.length) {
        const nextChar = fullText.slice(0, charIdx + 1)
        setCurrentText(nextChar)
        charIdx++
        timerRef.current = setTimeout(typeChar, 15) // ~15ms per character
      } else {
        // Finished current block
        if (blockIdx + 1 < currentBlocks.length) {
          // Pause 150-200ms between blocks
          timerRef.current = setTimeout(() => {
            setCurrentBlockIndex(blockIdx + 1)
            setCurrentText('')
          }, 180)
        } else {
          setIsComplete(true)
          animatedIds.add(contentId)
        }
      }
    }

    timerRef.current = setTimeout(typeChar, 15)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentBlockIndex, contentId, shouldSkipAnimation, isComplete, skipped])

  const displayedBlocks = blocks.map((block, idx) => {
    if (idx < currentBlockIndex) return block
    if (idx === currentBlockIndex) return currentText
    return ''
  })

  return {
    displayedBlocks,
    currentBlockIndex,
    isComplete,
    skip,
  }
}

export function TypewriterCursor({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-block w-[1.5px] h-[1.15em] ml-1 bg-accent/80 animate-pulse align-middle" />
  )
}
