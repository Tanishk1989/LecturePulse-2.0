import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useLectures } from '@/hooks/useLectures'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useToast } from '@/components/ui/ToastProvider'
import { listOfflineRecordings, removeOfflineRecording } from '@/lib/offlineQueue'
import { triggerLectureProcessing } from '@/services/processingService'
import { getProcessingOptions } from '@/lib/processingPreferences'
import { createTranscript } from '@/services/transcriptionService'

export function useOfflineSync() {
  const { user } = useAuthContext()
  const { uploadLecture } = useLectures()
  const online = useOnlineStatus()
  const { toast } = useToast()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    const count = (await listOfflineRecordings()).length
    setPendingCount(count)
  }, [])

  const syncQueue = useCallback(async () => {
    if (!user || !online || syncing) return

    const queue = await listOfflineRecordings()
    if (queue.length === 0) return

    setSyncing(true)
    let synced = 0

    try {
      for (const item of queue) {
        const saved = await uploadLecture({
          title: item.title,
          duration: item.duration,
          blob: item.blob,
          mediaKind: 'audio',
          source: 'record',
          mimeType: item.mimeType,
          skipProcessing: true,
          subject: item.subject,
        })

        if (!saved) continue

        if (item.transcriptText?.trim()) {
          await createTranscript({
            lectureId: saved.id,
            userId: user.uid,
            text: item.transcriptText,
            durationSeconds: item.duration,
            status: 'completed',
          })
        }

        void triggerLectureProcessing(saved.id, getProcessingOptions(user.uid))
        await removeOfflineRecording(item.id)
        synced += 1
      }

      if (synced > 0) {
        toast.success(`Synced ${synced} offline recording${synced === 1 ? '' : 's'}.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline sync failed.')
    } finally {
      setSyncing(false)
      await refreshCount()
    }
  }, [online, refreshCount, syncing, toast, uploadLecture, user])

  useEffect(() => {
    void refreshCount()
  }, [refreshCount])

  useEffect(() => {
    if (online) {
      void syncQueue()
    }
  }, [online, syncQueue])

  return { pendingCount, syncing, syncQueue, refreshCount }
}
