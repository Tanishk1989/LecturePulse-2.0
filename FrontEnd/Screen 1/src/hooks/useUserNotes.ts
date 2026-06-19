import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { getUserNotes } from '@/services/notesService'
import type { LectureNotes } from '@/types/notes'

export function useUserNotes() {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [notes, setNotes] = useState<LectureNotes[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setNotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const rows = await getUserNotes(user.uid)
      setNotes(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load notes.'
      toast.error(message)
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { notes, loading, refresh }
}
