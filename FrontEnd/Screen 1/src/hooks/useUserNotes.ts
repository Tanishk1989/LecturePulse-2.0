import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { getUserNotes } from '@/services/notesService'
import type { LectureNotes } from '@/types/notes'

export function useUserNotes() {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [notes, setNotes] = useState<LectureNotes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const owner = useRef<string | null>(null)
  const request = useRef(0)

  const refresh = useCallback(async () => {
    const version = ++request.current
    if (owner.current !== (user?.uid ?? null)) {
      owner.current = user?.uid ?? null
      setNotes([])
    }
    if (!user) {
      setNotes([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getUserNotes(user.uid)
      if (version !== request.current) return
      setNotes(rows)
    } catch (err) {
      if (version !== request.current) return
      const message = err instanceof Error ? err.message : 'Failed to load notes.'
      setError(message)
      toast.error(message)
    } finally {
      if (version === request.current) setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    void refresh()
    return () => { request.current += 1 }
  }, [refresh])

  return { notes, loading, error, refresh }
}
