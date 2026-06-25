import type { TimetableEntry } from '@/lib/timetable'

const DAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

function parseIcsTime(value: string): { hours: number; minutes: number } | null {
  const trimmed = value.trim()
  const match = trimmed.match(/(\d{2})(\d{2})(\d{2})$/)
  if (!match) return null
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function parseRruleDay(rrule: string | undefined, dtstart: string): number {
  const byDay = rrule?.match(/BYDAY=([A-Z,]+)/)?.[1]
  if (byDay) {
    const first = byDay.split(',')[0]
    if (first && DAY_MAP[first] !== undefined) return DAY_MAP[first]
  }

  const datePart = dtstart.includes('T') ? dtstart.split('T')[0] : dtstart.slice(0, 8)
  if (datePart.length === 8) {
    const year = Number(datePart.slice(0, 4))
    const month = Number(datePart.slice(4, 6)) - 1
    const day = Number(datePart.slice(6, 8))
    return new Date(year, month, day).getDay()
  }

  return 1
}

export function parseIcsToTimetable(icsText: string): TimetableEntry[] {
  const blocks = icsText.split(/BEGIN:VEVENT/i).slice(1)
  const entries: TimetableEntry[] = []

  for (const block of blocks) {
    const chunk = block.split(/END:VEVENT/i)[0] ?? ''
    const summary = chunk.match(/^SUMMARY:(.+)$/m)?.[1]?.trim()
    const dtstart = chunk.match(/^DTSTART[^:]*:(.+)$/m)?.[1]?.trim()
    const dtend = chunk.match(/^DTEND[^:]*:(.+)$/m)?.[1]?.trim()
    const rrule = chunk.match(/^RRULE:(.+)$/m)?.[1]?.trim()
    const location = chunk.match(/^LOCATION:(.+)$/m)?.[1]?.trim()

    if (!summary || !dtstart) continue

    const start = parseIcsTime(dtstart)
    const end = dtend ? parseIcsTime(dtend) : null
    if (!start) continue

    entries.push({
      id: crypto.randomUUID(),
      title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' '),
      subject: summary.split(' - ')[0]?.trim() || summary,
      dayOfWeek: parseRruleDay(rrule, dtstart),
      startTime: formatTime(start.hours, start.minutes),
      endTime: end ? formatTime(end.hours, end.minutes) : formatTime(start.hours + 1, start.minutes),
      location: location?.replace(/\\,/g, ','),
      autoRecordReminder: true,
    })
  }

  return entries
}

export function mergeTimetableEntries(
  existing: TimetableEntry[],
  imported: TimetableEntry[],
): TimetableEntry[] {
  const seen = new Set(
    existing.map((entry) => `${entry.dayOfWeek}-${entry.startTime}-${entry.title.toLowerCase()}`),
  )

  const merged = [...existing]
  for (const entry of imported) {
    const key = `${entry.dayOfWeek}-${entry.startTime}-${entry.title.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(entry)
  }

  return merged
}
