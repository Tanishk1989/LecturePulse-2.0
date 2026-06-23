import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import {
  deleteLecture as deleteLectureService,
  getUserLectures,
  importYouTubeLecture as importYouTubeLectureService,
  toggleFavorite as toggleFavoriteService,
  updateLecture as updateLectureService,
  uploadLecture as uploadLectureService,
} from '@/services/lectureService'
import { triggerLectureProcessing } from '@/services/processingService'
import type { YouTubeVideoMetadata } from '@/lib/youtubeUtils'
import type { LectureMediaKind, LectureRecording } from '@/types/lecture'

interface UploadLectureParams {
  title: string
  duration: number
  file?: File
  blob?: Blob
  mediaKind: LectureMediaKind
  source?: 'record' | 'upload' | 'youtube' | 'pdf'
  pageCount?: number | null
  originalFilename?: string
  mimeType?: string
  onProgress?: (percent: number) => void
  skipProcessing?: boolean
  subject?: string
}

interface LecturesContextValue {
  lectures: LectureRecording[]
  loading: boolean
  error: string | null
  uploadLecture: (input: UploadLectureParams) => Promise<LectureRecording | null>
  importYouTube: (metadata: YouTubeVideoMetadata, subject?: string) => Promise<LectureRecording | null>
  deleteLecture: (id: string) => Promise<void>
  updateLectureTitle: (id: string, title: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const LecturesContext = createContext<LecturesContextValue | null>(null)

function useLecturesState(): LecturesContextValue {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [lectures, setLectures] = useState<LectureRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setLectures([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const rows = await getUserLectures(user.uid)
      setLectures(rows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load lectures.'
      setError(message)
      setLectures([])
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const uploadLecture = useCallback(
    async (input: UploadLectureParams): Promise<LectureRecording | null> => {
      if (!user) {
        toast.error('Sign in to upload lectures.')
        return null
      }

      const fileOrBlob = input.file ?? input.blob
      if (!fileOrBlob) {
        toast.error('Upload failed. No file provided.')
        return null
      }

      try {
        const saved = await uploadLectureService(
          {
            userId: user.uid,
            title: input.title,
            duration: input.duration,
            file: fileOrBlob,
            mediaKind: input.mediaKind,
            source: input.source ?? 'upload',
            pageCount: input.pageCount,
            originalFilename: input.originalFilename ?? (input.file?.name ?? undefined),
            mimeType:
              input.mimeType ??
              input.file?.type ??
              (input.blob instanceof Blob ? input.blob.type : undefined),
            subject: input.subject,
          },
          input.onProgress,
        )

        setLectures((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
        toast.success('Lecture uploaded successfully.')
        if (!input.skipProcessing) {
          void triggerLectureProcessing(saved.id)
        }
        return saved
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed.'
        toast.error(message.includes('Storage') ? 'Storage unavailable.' : message)
        throw error
      }
    },
    [toast, user],
  )

  const importYouTube = useCallback(
    async (metadata: YouTubeVideoMetadata, subject?: string): Promise<LectureRecording | null> => {
      if (!user) {
        toast.error('Sign in to import YouTube videos.')
        return null
      }

      try {
        const saved = await importYouTubeLectureService({
          userId: user.uid,
          url: metadata.url,
          title: metadata.title,
          thumbnail: metadata.thumbnailUrl,
          subject,
        })

        setLectures((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
        toast.success('YouTube video imported successfully.')
        void triggerLectureProcessing(saved.id)
        return saved
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed.'
        toast.error(message)
        throw error
      }
    },
    [toast, user],
  )

  const deleteLecture = useCallback(
    async (id: string) => {
      if (!user) {
        toast.error('Sign in to delete lectures.')
        return
      }

      try {
        await deleteLectureService(user.uid, id)
        setLectures((current) => current.filter((item) => item.id !== id))
        toast.success('Lecture deleted.')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete lecture.'
        toast.error(message)
      }
    },
    [toast, user],
  )

  const updateLectureTitle = useCallback(
    async (id: string, title: string) => {
      const trimmed = title.trim()
      if (!trimmed || !user) return

      try {
        const updated = await updateLectureService(user.uid, id, { title: trimmed })
        setLectures((current) =>
          current.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to rename lecture.'
        toast.error(message)
      }
    },
    [toast, user],
  )

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!user) {
        toast.error('Sign in to manage favorites.')
        return
      }

      const target = lectures.find((item) => item.id === id)
      if (!target) return

      try {
        const updated = await toggleFavoriteService(user.uid, id, !target.favorite)
        setLectures((current) =>
          current.map((item) => (item.id === id ? { ...item, ...updated } : item)),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update favorite.'
        toast.error(message)
      }
    },
    [lectures, toast, user],
  )

  return useMemo(
    () => ({
      lectures,
      loading,
      error,
      uploadLecture,
      importYouTube,
      deleteLecture,
      updateLectureTitle,
      toggleFavorite,
      refresh,
    }),
    [lectures, loading, error, uploadLecture, importYouTube, deleteLecture, updateLectureTitle, toggleFavorite, refresh],
  )
}

export function LectureProvider({ children }: { children: ReactNode }) {
  const value = useLecturesState()
  return <LecturesContext.Provider value={value}>{children}</LecturesContext.Provider>
}

export function useLectures(): LecturesContextValue {
  const context = useContext(LecturesContext)
  if (!context) {
    throw new Error('useLectures must be used within a LectureProvider')
  }
  return context
}
