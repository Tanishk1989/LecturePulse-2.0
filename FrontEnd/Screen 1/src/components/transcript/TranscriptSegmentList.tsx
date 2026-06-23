import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useReducedMotion } from 'framer-motion'
import type { TranscriptSearchMatch } from '@/hooks/useTranscriptSearch'
import type { TranscriptSegment } from '@/types/transcript'
import { cn } from '@/lib/utils'
import { ScrollFadeContainer } from '@/components/shared/ScrollFadeContainer'

interface TranscriptSegmentListProps {
  segments: TranscriptSegment[]
  fullText: string
  query: string
  activeMatch: TranscriptSearchMatch | null
  onSeek: (seconds: number) => void
  hasPlayer?: boolean
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  className?: string
}

export interface TranscriptSegmentListHandle {
  updateTime: (time: number) => void
}

function highlightText(
  text: string,
  query: string,
  activeMatch: TranscriptSearchMatch | null,
  segmentIndex: number,
): ReactNode {
  if (!query.trim()) return text

  const normalized = query.trim()
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  let localMatchIndex = 0

  return parts.map((part, index) => {
    if (part.toLowerCase() !== normalized.toLowerCase()) return part

    const isActive =
      activeMatch?.segmentIndex === segmentIndex &&
      activeMatch.matchIndex === localMatchIndex

    localMatchIndex += 1

    return (
      <mark
        key={index}
        className={cn(
          'rounded-sm px-0.5 not-italic',
          isActive
            ? 'bg-accent/40 text-foreground ring-1 ring-accent/50'
            : 'bg-accent/20 text-foreground',
        )}
      >
        {part}
      </mark>
    )
  })
}

export const TranscriptSegmentList = forwardRef<
  TranscriptSegmentListHandle,
  TranscriptSegmentListProps
>(function TranscriptSegmentList(
  { segments, fullText, query, activeMatch, onSeek, hasPlayer = true, onScroll, className },
  ref,
) {
  const prefersReducedMotion = useReducedMotion()
  const listRef = useRef<HTMLDivElement>(null)
  const matchRef = useRef<HTMLDivElement>(null)

  // Simulation timer for reading mode when there is no player
  const [simulatedTime, setSimulatedTime] = useState(0)
  const isSimulated = !hasPlayer && !prefersReducedMotion && !query.trim()

  const maxTime = useMemo(() => {
    if (segments.length === 0) return 0
    return segments[segments.length - 1].end
  }, [segments])

  useEffect(() => {
    if (!isSimulated) return

    const startTime = performance.now()
    let animationFrameId: number

    const tick = () => {
      const elapsed = (performance.now() - startTime) / 1000
      if (elapsed >= maxTime) {
        setSimulatedTime(maxTime)
      } else {
        setSimulatedTime(elapsed)
        animationFrameId = requestAnimationFrame(tick)
      }
    }

    animationFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isSimulated, maxTime])

  // Flat mapping of words to quickly resolve timing bounds and DOM elements
  const flatWords = useMemo(() => {
    const list: { key: string; start: number; end: number }[] = []
    segments.forEach((segment, segmentIndex) => {
      const tokens = segment.text.split(/(\s+)/)
      const wordTokens = tokens.filter((t) => t.trim().length > 0)
      const totalWords = wordTokens.length
      const duration = segment.end - segment.start
      const timePerWord = duration > 0 ? duration / totalWords : 0

      let wordIdx = 0
      tokens.forEach((token) => {
        const isWhitespace = token.trim().length === 0
        if (!isWhitespace) {
          const currentWordIdx = wordIdx
          wordIdx += 1
          list.push({
            key: `${segmentIndex}-${currentWordIdx}`,
            start: segment.start + currentWordIdx * timePerWord,
            end: segment.start + (currentWordIdx + 1) * timePerWord,
          })
        }
      })
    })
    return list
  }, [segments])

  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map())
  const lastActiveIndexRef = useRef<number>(-1)

  // High-performance DOM-direct updates
  const localUpdateTime = useCallback(
    (time: number) => {
      if (prefersReducedMotion || query.trim() || flatWords.length === 0) return

      let activeIdx = -1
      for (let i = 0; i < flatWords.length; i++) {
        if (time >= flatWords[i].start && time < flatWords[i].end) {
          activeIdx = i
          break
        }
      }

      if (activeIdx === -1) {
        let lastPlayedIdx = -1
        for (let i = flatWords.length - 1; i >= 0; i--) {
          if (time >= flatWords[i].end) {
            lastPlayedIdx = i
            break
          }
        }
        activeIdx = lastPlayedIdx + 1
      }

      const prevActiveIndex = lastActiveIndexRef.current
      if (activeIdx === prevActiveIndex) return

      flatWords.forEach((word, idx) => {
        const el = wordRefs.current.get(word.key)
        if (!el) return

        if (idx < activeIdx) {
          el.className =
            'transition-all duration-150 cursor-pointer select-text text-muted/50 hover:text-accent hover:underline hover:decoration-accent/35'
        } else if (idx === activeIdx) {
          el.className =
            'transition-all duration-150 cursor-pointer select-text text-accent border-b border-accent/40 font-semibold hover:text-accent hover:underline hover:decoration-accent/35'
        } else {
          el.className =
            'transition-all duration-150 cursor-pointer select-text text-foreground/90 hover:text-accent hover:underline hover:decoration-accent/35'
        }
      })

      lastActiveIndexRef.current = activeIdx
    },
    [flatWords, prefersReducedMotion, query],
  )

  useImperativeHandle(ref, () => ({
    updateTime: localUpdateTime,
  }))

  useEffect(() => {
    if (isSimulated) {
      localUpdateTime(simulatedTime)
    }
  }, [isSimulated, simulatedTime, localUpdateTime])

  useEffect(() => {
    // Reset indices when flatWords or query changes
    lastActiveIndexRef.current = -1
    const timer = setTimeout(() => {
      wordRefs.current.forEach((el) => {
        if (query.trim() || prefersReducedMotion) {
          el.className =
            'transition-all duration-150 cursor-pointer select-text text-foreground/90 hover:text-accent hover:underline hover:decoration-accent/35'
        } else {
          el.className =
            'transition-all duration-150 cursor-pointer select-text text-foreground/90 hover:text-accent hover:underline hover:decoration-accent/35'
        }
      })
    }, 50)
    return () => clearTimeout(timer)
  }, [flatWords, query, prefersReducedMotion])

  useEffect(() => {
    if (query.trim() && activeMatch) {
      matchRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    }
  }, [activeMatch, prefersReducedMotion, query])

  const handleWordClick = (wordStart: number) => {
    const selection = window.getSelection()?.toString().trim()
    if (selection) {
      // Ignore click seek when text is selected to avoid conflict
      return
    }
    onSeek(wordStart)
  }

  if (segments.length === 0 && fullText) {
    return (
      <div className={cn('px-1 py-2', className)}>
        <p className="text-[15px] leading-[2.1] text-foreground/90">
          {highlightText(fullText, query, activeMatch, 0)}
        </p>
      </div>
    )
  }

  if (segments.length === 0) {
    return null
  }

  if (query.trim()) {
    return (
      <ScrollFadeContainer
        ref={listRef}
        onScroll={onScroll}
        fadeColor="var(--background)"
        className={cn('min-h-0 flex-1 px-1 pr-3', className)}
      >
        {segments.map((segment, segmentIndex) => {
          const isMatchSegment = activeMatch?.segmentIndex === segmentIndex
          return (
            <div key={segment.id} ref={isMatchSegment ? matchRef : undefined}>
              <p className="mb-6 text-[15px] leading-[2.1] text-foreground/90 select-text">
                {highlightText(segment.text, query, activeMatch, segmentIndex)}
              </p>
            </div>
          )
        })}
      </ScrollFadeContainer>
    )
  }

  return (
    <ScrollFadeContainer
      ref={listRef}
      onScroll={onScroll}
      fadeColor="var(--background)"
      className={cn('min-h-0 flex-1 px-1 pr-3', className)}
    >
      {segments.map((segment, segmentIndex) => {
        const tokens = segment.text.split(/(\s+)/)
        const wordTokens = tokens.filter((t) => t.trim().length > 0)
        const totalWords = wordTokens.length
        const duration = segment.end - segment.start
        const timePerWord = duration > 0 ? duration / totalWords : 0

        let wordIdx = 0

        return (
          <p
            key={segment.id}
            className="mb-6 text-[15px] leading-[2.1] text-foreground/90 select-text"
          >
            {tokens.map((token, index) => {
              const isWhitespace = token.trim().length === 0
              if (isWhitespace) {
                return <span key={index}>{token}</span>
              }

              const currentWordIdx = wordIdx
              wordIdx += 1

              const wordStart = segment.start + currentWordIdx * timePerWord
              const wordKey = `${segmentIndex}-${currentWordIdx}`

              return (
                <span
                  key={index}
                  ref={(el) => {
                    if (el) wordRefs.current.set(wordKey, el)
                    else wordRefs.current.delete(wordKey)
                  }}
                  onClick={() => handleWordClick(wordStart)}
                  className="transition-all duration-150 cursor-pointer select-text text-foreground/90 hover:text-accent hover:underline hover:decoration-accent/35"
                >
                  {token}
                </span>
              )
            })}
          </p>
        )
      })}
    </ScrollFadeContainer>
  )
})
