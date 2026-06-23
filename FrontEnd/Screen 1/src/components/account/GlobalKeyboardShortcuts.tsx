import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDashboard } from '@/context/DashboardContext'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function GlobalKeyboardShortcuts({ children }: { children: ReactNode }) {
  const { openShortcuts, closeShortcuts, shortcutsOpen, openTutor } = useDashboard()
  const navigate = useNavigate()
  const location = useLocation()
  const gSequenceRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetGSequence = useCallback(() => {
    gSequenceRef.current = false
    if (gTimerRef.current) {
      clearTimeout(gTimerRef.current)
      gTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        if (event.key === 'Escape' && shortcutsOpen) {
          event.preventDefault()
          closeShortcuts()
        }
        return
      }

      const key = event.key.toLowerCase()
      const mod = event.metaKey || event.ctrlKey

      if (mod && key === 'k') {
        event.preventDefault()
        openTutor()
        return
      }

      if (mod && key === 'j') {
        event.preventDefault()
        openTutor()
        return
      }

      if (key === '?' && !mod && !event.altKey) {
        event.preventDefault()
        openShortcuts()
        return
      }

      if (key === 'escape' && shortcutsOpen) {
        event.preventDefault()
        closeShortcuts()
        return
      }

      if (key === 'g' && !mod && !event.altKey) {
        gSequenceRef.current = true
        if (gTimerRef.current) clearTimeout(gTimerRef.current)
        gTimerRef.current = setTimeout(resetGSequence, 1200)
        return
      }

      if (gSequenceRef.current && !mod) {
        resetGSequence()
        if (key === 'd') {
          event.preventDefault()
          if (location.pathname !== '/dashboard') navigate('/dashboard')
          return
        }
        if (key === 'l') {
          event.preventDefault()
          navigate('/dashboard/lectures')
          return
        }
        if (key === 'r') {
          event.preventDefault()
          navigate('/dashboard/record')
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      resetGSequence()
    }
  }, [
    closeShortcuts,
    location.pathname,
    navigate,
    openShortcuts,
    openTutor,
    resetGSequence,
    shortcutsOpen,
  ])

  return children
}
