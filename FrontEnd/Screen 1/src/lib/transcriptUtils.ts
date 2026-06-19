export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatLanguage(code: string | null | undefined): string | null {
  if (!code) return null
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'language' })
    return display.of(code) ?? code
  } catch {
    return code
  }
}
