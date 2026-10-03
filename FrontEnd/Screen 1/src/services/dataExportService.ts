import { getUserFlashcards } from '@/services/flashcardService'
import { getUserLectures } from '@/services/lectureService'
import { getUserNotes } from '@/services/notesService'
import { loadUserPreferences } from '@/lib/userPreferences'
import { apiFetch } from '@/lib/api'

export async function exportUserDataArchive(userId: string): Promise<void> {
  const [lectures, notes, flashcards] = await Promise.all([
    getUserLectures(userId),
    getUserNotes(userId),
    getUserFlashcards(userId),
  ])

  const accountDocuments: unknown[] = []
  let cursor: string | null = null
  do {
    const page: { documents: unknown[]; nextCursor: string | null } = await apiFetch(`/user-sync${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
    accountDocuments.push(...page.documents)
    cursor = page.nextCursor
  } while (cursor)

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    lectures,
    notes,
    flashcards,
    preferences: loadUserPreferences(userId),
    accountDocuments,
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
