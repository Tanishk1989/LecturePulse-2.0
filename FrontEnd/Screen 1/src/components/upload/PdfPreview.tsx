import { FileText } from 'lucide-react'
import { formatFileSize } from '@/lib/uploadUtils'
import { cn } from '@/lib/utils'

interface PdfPreviewProps {
  url: string
  fileSize: number
  pageCount: number | null
}

export function PdfPreview({ url, fileSize, pageCount }: PdfPreviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr]">
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl border border-white/[0.08]',
          'bg-white/[0.02] p-5 text-center',
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald/25 bg-emerald/[0.08]">
          <FileText className="h-7 w-7 text-emerald" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-foreground">PDF Document</p>
        <p className="mt-2 text-xs text-muted">{formatFileSize(fileSize)}</p>
        <p className="mt-1 text-xs text-muted">
          {pageCount ? `${pageCount} page${pageCount === 1 ? '' : 's'}` : 'Pages unavailable'}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <iframe
          src={url}
          title="PDF preview"
          className="h-[280px] w-full bg-white"
        />
      </div>
    </div>
  )
}
