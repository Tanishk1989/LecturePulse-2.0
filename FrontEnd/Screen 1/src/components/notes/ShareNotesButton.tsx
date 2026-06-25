import { useState } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import { useI18n } from '@/context/I18nContext'
import { createLectureShareLink } from '@/services/shareService'
import { cn } from '@/lib/utils'

interface ShareNotesButtonProps {
  lectureId: string
  className?: string
}

export function ShareNotesButton({ lectureId, className }: ShareNotesButtonProps) {
  const { toast } = useToast()
  const { translate } = useI18n()
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    try {
      const result = await createLectureShareLink(lectureId)
      const fullUrl = `${window.location.origin}${result.shareUrl}`
      setShareUrl(fullUrl)
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success('Share link copied to clipboard.')
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create share link.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied.')
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={loading}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2.5',
          'text-sm font-medium text-foreground bg-white/[0.03] transition-all cursor-pointer',
          'hover:border-accent/25 hover:bg-accent/[0.06] disabled:opacity-50',
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {loading ? translate('common.loading') : translate('common.share')}
      </button>
      {shareUrl && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.08] px-3 py-2 text-xs text-accent cursor-pointer hover:bg-accent/[0.12]"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      )}
    </div>
  )
}
