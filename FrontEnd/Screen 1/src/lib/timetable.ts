export interface TimetableEntry {
  id: string
  title: string
  subject: string
  dayOfWeek: number
  startTime: string
  endTime: string
  location?: string
  autoRecordReminder: boolean
}

const STORAGE_KEY = 'lecturepulse:timetable'

export function loadTimetable(userId: string): TimetableEntry[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`)
    if (!raw) return []
    return JSON.parse(raw) as TimetableEntry[]
  } catch {
    return []
  }
}

export function saveTimetable(userId: string, entries: TimetableEntry[]): void {
  localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(entries))
}

export function getUpcomingClass(
  entries: TimetableEntry[],
  now = new Date(),
): TimetableEntry | null {
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const todayClasses = entries
    .filter((entry) => entry.dayOfWeek === currentDay)
    .map((entry) => {
      const [sh, sm] = entry.startTime.split(':').map(Number)
      const startMinutes = sh * 60 + sm
      return { entry, startMinutes }
    })
    .filter(({ startMinutes }) => startMinutes >= currentMinutes - 5)
    .sort((a, b) => a.startMinutes - b.startMinutes)

  return todayClasses[0]?.entry ?? null
}

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
