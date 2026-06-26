export interface ParsedExamTip {
  title: string
  description: string | null
}

/** Split AI lines like `**Topic** — explanation` into clean title + body. */
export function parseExamTipLine(raw: string): ParsedExamTip {
  const text = raw.trim()
  if (!text) return { title: '', description: null }

  const withDescription = text.match(/^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/s)
  if (withDescription) {
    return {
      title: withDescription[1].trim(),
      description: withDescription[2].trim(),
    }
  }

  const boldOnly = text.match(/^\*\*(.+?)\*\*$/)
  if (boldOnly) {
    return { title: boldOnly[1].trim(), description: null }
  }

  const inlineBold = text.match(/^\*\*(.+?)\*\*\s+(.+)$/s)
  if (inlineBold) {
    return { title: inlineBold[1].trim(), description: inlineBold[2].trim() }
  }

  return { title: text.replace(/\*\*/g, '').trim(), description: null }
}
