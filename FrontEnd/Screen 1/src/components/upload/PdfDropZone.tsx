import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { getMediaKind } from '@/lib/uploadUtils'
import { cn } from '@/lib/utils'

interface PdfDropZoneProps {
  onFileSelect: (file: File) => void
}

export function PdfDropZone({ onFileSelect }: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const handleFile = (file: File | undefined) => {
    if (!file || getMediaKind(file) !== 'pdf') return
    onFileSelect(file)
  }

  return (
    <motion.button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragging(false)
        handleFile(event.dataTransfer.files[0])
      }}
      className={cn(
        'relative w-full rounded-3xl border-2 border-dashed px-6 py-14 md:py-16 text-center cursor-pointer',
        'border-accent/25 bg-accent/[0.03] backdrop-blur-xl transition-all duration-300',
        'hover:border-accent/45 hover:bg-accent/[0.06] hover:shadow-[0_0_48px_rgba(214,162,11,0.12)]',
        isDragging && 'border-accent/55 bg-accent/[0.08] scale-[1.01] shadow-[0_0_56px_rgba(214,162,11,0.18)]',
      )}
      animate={prefersReducedMotion ? {} : { scale: isDragging ? 1.01 : 1 }}
      whileHover={prefersReducedMotion ? {} : { scale: 1.008 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      <div className="pointer-events-none">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent/[0.08] shadow-[0_0_32px_rgba(214,162,11,0.15)]">
          <FileText className="h-7 w-7 text-accent" strokeWidth={1.75} />
        </div>
        <p className="text-lg font-semibold text-foreground">Drop PDF here</p>
        <p className="mt-2 text-sm text-muted">or click to browse</p>
        <div className="mt-6 flex items-center justify-center">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-medium tracking-wide text-muted">
            PDF only
          </span>
        </div>
      </div>
    </motion.button>
  )
}
