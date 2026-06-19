import { useEffect, useRef } from 'react'
import { pollUntilProcessingDone } from '@/services/processingService'

export function useProcessingPoll(
  userId: string | undefined,
  lectureId: string | undefined,
  isActive: boolean,
  onUpdate: () => void,
): void {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!userId || !lectureId || !isActive) return

    const stop = pollUntilProcessingDone(userId, lectureId, () => {
      onUpdateRef.current()
    })

    return stop
  }, [userId, lectureId, isActive])
}
