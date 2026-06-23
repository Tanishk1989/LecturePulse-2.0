import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, FileAudio, FileText, FileVideo, RefreshCw, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ParticleField } from '@/components/effects/ParticleField'
import { AudioPreviewPlayer } from '@/components/upload/AudioPreviewPlayer'
import { PdfPreview } from '@/components/upload/PdfPreview'
import { UploadDropZone } from '@/components/upload/UploadDropZone'
import { UploadProgressBar } from '@/components/upload/UploadProgressBar'
import { VideoPreviewPlayer } from '@/components/upload/VideoPreviewPlayer'
import { useLectures } from '@/hooks/useLectures'
import { formatDuration } from '@/lib/formatDuration'
import { analyzeUploadFile, deriveLectureTitle, formatFileSize } from '@/lib/uploadUtils'
import { HighlightedPageTitle, dashboardPageTitleClass } from '@/components/dashboard/ui/DashboardPageShell'
import { cn } from '@/lib/utils'

type UploadPhase = 'idle' | 'selected' | 'uploading' | 'success' | 'failed'

interface SelectedFileState {
  file: File
  previewUrl: string
  mediaKind: 'audio' | 'video' | 'pdf'
  duration: number
  pageCount: number | null
}

interface SavedLectureState {
  id: string
  mediaKind: 'audio' | 'video' | 'pdf'
}

function UploadPageBackground() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute inset-0 star-particles opacity-30" />
      <ParticleField count={32} yellowRatio={0.65} />
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.05] via-transparent to-ambient/[0.04]" />
      <motion.div
        className="absolute top-1/4 left-1/2 h-[360px] w-[480px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[120px]"
        animate={prefersReducedMotion ? {} : { opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

function FileTypeIcon({ kind }: { kind: 'audio' | 'video' | 'pdf' }) {
  if (kind === 'video') return <FileVideo className="h-6 w-6 text-accent" strokeWidth={1.5} />
  if (kind === 'pdf') return <FileText className="h-6 w-6 text-emerald" strokeWidth={1.5} />
  return <FileAudio className="h-6 w-6 text-accent" strokeWidth={1.5} />
}

const SUBJECTS = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biology',
  'History',
  'Economics',
  'Literature',
]

export function UploadLecturePage() {
  const { uploadLecture } = useLectures()
  const [phase, setPhase] = useState<UploadPhase>('idle')
  const [selected, setSelected] = useState<SelectedFileState | null>(null)
  const [savedLecture, setSavedLecture] = useState<SavedLectureState | null>(null)
  const [progress, setProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [subjectSelect, setSubjectSelect] = useState('')
  const [customSubject, setCustomSubject] = useState('')

  const clearSelection = useCallback(() => {
    if (selected?.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(selected.previewUrl)
    }
    setSelected(null)
    setSavedLecture(null)
    setProgress(0)
    setPhase('idle')
    setSubjectSelect('')
    setCustomSubject('')
  }, [selected])

  useEffect(() => {
    return () => {
      if (selected?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(selected.previewUrl)
      }
    }
  }, [selected])

  const handleFileSelect = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setPhase('selected')
    setProgress(0)

    try {
      const analysis = await analyzeUploadFile(file)
      const previewUrl = URL.createObjectURL(file)

      setSelected({
        file,
        previewUrl,
        mediaKind: analysis.mediaKind,
        duration: analysis.duration,
        pageCount: analysis.pageCount,
      })
    } catch {
      setPhase('idle')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selected) return

    setPhase('uploading')
    setProgress(0)

    try {
      const subjectVal = subjectSelect === 'other' ? customSubject.trim() : subjectSelect
      const saved = await uploadLecture({
        title: deriveLectureTitle(selected.file.name),
        duration: selected.duration,
        file: selected.file,
        mediaKind: selected.mediaKind,
        source: 'upload',
        pageCount: selected.pageCount,
        onProgress: setProgress,
        subject: subjectVal || undefined,
      })

      if (saved) {
        setProgress(100)
        setSavedLecture({ id: saved.id, mediaKind: saved.mediaKind })
        setPhase('success')
      } else {
        setPhase('failed')
        setProgress(0)
      }
    } catch {
      setPhase('failed')
      setProgress(0)
    }
  }, [uploadLecture, selected, subjectSelect, customSubject])

  const fileMeta = useMemo(() => {
    if (!selected) return null
    return {
      name: selected.file.name,
      size: formatFileSize(selected.file.size),
      duration: selected.duration > 0 ? formatDuration(selected.duration) : null,
    }
  }, [selected])

  return (
    <div className="relative -mx-5 -my-7 lg:-mx-8 lg:-my-9 min-h-[calc(100dvh-72px)]">
      <div
        className={cn(
          'relative mx-auto flex min-h-[calc(100dvh-72px)] max-w-3xl flex-col overflow-hidden',
          'rounded-none border-0 bg-[#080808]/80 backdrop-blur-xl md:rounded-3xl md:border md:border-white/[0.06]',
        )}
      >
        <UploadPageBackground />

        <div className="relative z-10 flex flex-1 flex-col px-5 py-8 md:px-10 md:py-12">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] shadow-[0_0_40px_rgba(var(--color-accent-rgb),0.18)]"
            >
              <Upload className="h-7 w-7 text-accent" strokeWidth={1.75} />
            </motion.div>
            <h1 className={dashboardPageTitleClass}>
              <HighlightedPageTitle title="Upload Lecture" />
            </h1>
            <p className="mt-3 text-sm text-muted md:text-base">
              Audio, Video, or PDF. Drag &amp; Drop supported.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {phase === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center py-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.1] shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  <Check className="h-9 w-9 text-emerald" strokeWidth={2} />
                </motion.div>
                <p className="font-heading text-3xl text-foreground">Upload complete.</p>
                <p className="mt-3 max-w-sm text-sm text-muted leading-relaxed">
                  {savedLecture && savedLecture.mediaKind !== 'pdf'
                    ? "Your lecture is saved. We're turning it into searchable notes and study material."
                    : 'Your lecture is saved and ready in your library.'}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  {savedLecture && savedLecture.mediaKind !== 'pdf' && (
                    <Link
                      to={`/transcript/${savedLecture.id}`}
                      className={cn(
                        'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                        'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                      )}
                    >
                      View Progress
                    </Link>
                  )}
                  <Link
                    to="/dashboard/lectures"
                    className={cn(
                      'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
                      savedLecture?.mediaKind === 'pdf'
                        ? 'bg-accent text-background shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.2)] hover:bg-accent-soft'
                        : 'border border-white/[0.12] bg-white/[0.03] text-foreground',
                    )}
                  >
                    View in Library
                  </Link>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-foreground',
                      'bg-white/[0.03] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer',
                    )}
                  >
                    Upload Another
                  </button>
                </div>
              </motion.div>
            ) : phase === 'idle' || !selected ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="flex flex-1 flex-col justify-center"
              >
                <UploadDropZone onFileSelect={(file) => void handleFileSelect(file)} />
              </motion.div>
            ) : (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className={cn(
                  'flex flex-1 flex-col rounded-3xl border border-white/[0.08] bg-card/70 p-5 backdrop-blur-xl md:p-7',
                  'transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]',
                )}
              >
                <div className="mb-6 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/[0.06]">
                    <FileTypeIcon kind={selected.mediaKind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{fileMeta?.name}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {fileMeta?.duration && (
                        <>
                          <span className="font-mono tabular-nums">{fileMeta.duration}</span>
                          <span className="text-white/20">·</span>
                        </>
                      )}
                      <span>{fileMeta?.size}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={phase === 'uploading'}
                    aria-label="Remove selected file"
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08]',
                      'bg-white/[0.03] text-muted transition-all duration-300 cursor-pointer',
                      'hover:-translate-y-0.5 hover:text-foreground hover:border-white/[0.14]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {isAnalyzing ? (
                  <p className="mb-6 text-sm text-muted">Analyzing file…</p>
                ) : (
                  <div className="mb-6">
                    {selected.mediaKind === 'audio' && (
                      <AudioPreviewPlayer url={selected.previewUrl} duration={selected.duration} />
                    )}
                    {selected.mediaKind === 'video' && (
                      <VideoPreviewPlayer url={selected.previewUrl} duration={selected.duration} />
                    )}
                    {selected.mediaKind === 'pdf' && (
                      <PdfPreview
                        url={selected.previewUrl}
                        fileSize={selected.file.size}
                        pageCount={selected.pageCount}
                      />
                    )}
                  </div>
                )}

                {phase === 'selected' && (
                  <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <label
                      htmlFor="subject-select"
                      className="block text-xs font-semibold text-muted mb-2 uppercase tracking-wider"
                    >
                      Lecture Subject (Optional)
                    </label>
                    <div className="flex flex-col gap-3">
                      <select
                        id="subject-select"
                        value={subjectSelect}
                        onChange={(e) => setSubjectSelect(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-[#0E0E0E] px-3 py-2 text-sm text-foreground outline-none focus:border-accent/35"
                      >
                        <option value="" className="bg-[#0D0D0D]">Select a subject...</option>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub} className="bg-[#0D0D0D]">{sub}</option>
                        ))}
                        <option value="other" className="bg-[#0D0D0D]">Other (Type Custom...)</option>
                      </select>
                      {subjectSelect === 'other' && (
                        <input
                          type="text"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder="Type custom subject (e.g. Chemistry, Philosophy)"
                          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground outline-none focus:border-accent/35"
                        />
                      )}
                    </div>
                  </div>
                )}

                {(phase === 'uploading' || progress > 0) && (
                  <UploadProgressBar progress={progress} className="mb-6" />
                )}

                {phase === 'failed' && (
                  <div className="mb-6 rounded-2xl border border-red/20 bg-red/[0.06] px-4 py-3 text-sm text-red">
                    Upload failed. Check your connection and try again.
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={phase === 'uploading'}
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border border-white/[0.12] px-5 py-3 text-sm font-medium text-foreground',
                      'bg-white/[0.03] transition-all duration-300 cursor-pointer hover:-translate-y-0.5',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    Remove
                  </button>
                  {phase === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => void handleUpload()}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                        'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.18)] transition-all duration-300 cursor-pointer',
                        'hover:bg-accent-soft hover:-translate-y-0.5',
                      )}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry Upload
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleUpload()}
                      disabled={phase === 'uploading' || isAnalyzing}
                      className={cn(
                        'inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background',
                        'shadow-[0_0_24px_rgba(var(--color-accent-rgb),0.18)] transition-all duration-300 cursor-pointer',
                        'hover:bg-accent-soft hover:-translate-y-0.5 hover:scale-[1.02]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {phase === 'uploading' ? 'Uploading…' : 'Upload Lecture'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
