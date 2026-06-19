import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TranscriptSegment } from '@/types/transcript'

export interface TranscriptSearchMatch {
  segmentId: number
  segmentIndex: number
  matchIndex: number
}

export function useTranscriptSearch(segments: TranscriptSegment[]) {
  const [query, setQuery] = useState('')
  const [activeMatchIndex, setActiveMatchIndex] = useState(0)

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []

    const results: TranscriptSearchMatch[] = []

    segments.forEach((segment, segmentIndex) => {
      const text = segment.text.toLowerCase()
      let start = 0
      let matchIndex = 0

      while (start < text.length) {
        const index = text.indexOf(normalized, start)
        if (index === -1) break
        results.push({ segmentId: segment.id, segmentIndex, matchIndex })
        matchIndex += 1
        start = index + normalized.length
      }
    })

    return results
  }, [query, segments])

  useEffect(() => {
    setActiveMatchIndex(0)
  }, [query])

  useEffect(() => {
    if (matches.length === 0) {
      setActiveMatchIndex(0)
      return
    }
    if (activeMatchIndex >= matches.length) {
      setActiveMatchIndex(0)
    }
  }, [activeMatchIndex, matches.length])

  const goToNextMatch = useCallback((): TranscriptSearchMatch | null => {
    if (matches.length === 0) return null
    const nextIndex = (activeMatchIndex + 1) % matches.length
    setActiveMatchIndex(nextIndex)
    return matches[nextIndex] ?? null
  }, [activeMatchIndex, matches])

  const goToPreviousMatch = useCallback((): TranscriptSearchMatch | null => {
    if (matches.length === 0) return null
    const nextIndex = (activeMatchIndex - 1 + matches.length) % matches.length
    setActiveMatchIndex(nextIndex)
    return matches[nextIndex] ?? null
  }, [activeMatchIndex, matches])

  const activeMatch = matches[activeMatchIndex] ?? null

  return {
    query,
    setQuery,
    matches,
    matchCount: matches.length,
    activeMatchIndex,
    activeMatch,
    goToNextMatch,
    goToPreviousMatch,
    hasQuery: query.trim().length > 0,
  }
}
