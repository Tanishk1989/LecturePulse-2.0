import { getUserFlashcards } from '@/services/flashcardService'
import { getUserLectures } from '@/services/lectureService'
import { getUserNotes } from '@/services/notesService'
import { loadUserPreferences } from '@/lib/userPreferences'

export async function exportUserDataArchive(userId: string): Promise<void> {
  const [lectures, notes, flashcards] = await Promise.all([
    getUserLectures(userId),
    getUserNotes(userId),
    getUserFlashcards(userId),
  ])

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    lectures,
    notes,
    flashcards,
    preferences: loadUserPreferences(userId),
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `lecturepulse-export-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
