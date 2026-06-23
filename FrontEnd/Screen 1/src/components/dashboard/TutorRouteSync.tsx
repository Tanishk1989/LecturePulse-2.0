import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteLectureId, useAiTutorContext } from '@/context/AiTutorContext'

export function TutorRouteSync() {
  const location = useLocation()
  const { syncFromRoute } = useAiTutorContext()

  useEffect(() => {
    syncFromRoute(getRouteLectureId(location.pathname))
  }, [location.pathname, syncFromRoute])

  return null
}
