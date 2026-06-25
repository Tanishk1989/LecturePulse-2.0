import { useState } from 'react'
import { Languages, Loader2, X } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { useToast } from '@/components/ui/ToastProvider'
import { translateContent } from '@/services/translationService'
import { cn } from '@/lib/utils'

interface TranslateContentButtonProps {
  sourceText: string
  contextLabel?: string
  className?: string
}

export function TranslateContentButton({
  sourceText,
  contextLabel,
  className,
}: TranslateContentButtonProps) {
  const { locale, translate } = useI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [translated, setTranslated] = useState('')

  const targetLanguage = locale === 'hi' ? 'en' : 'hi'

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error('Nothing to translate yet.')
      return
    }

    setLoading(true)
    setPanelOpen(true)
    try {
      const result = await translateContent(sourceText.slice(0, 12000), targetLanguage, contextLabel)
      setTranslated(result)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Translation failed.')
      setPanelOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => void handleTranslate()}
        disabled={loading || !sourceText.trim()}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-4 py-2',
          'text-xs font-medium text-foreground bg-white/[0.03] transition-all cursor-pointer',
          'hover:border-accent/25 hover:bg-accent/[0.06] disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Languages className="h-3.5 w-3.5" />
        )}
        {loading ? translate('translate.translating') : translate('translate.button')}
      </button>

      {panelOpen && (
        <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,28rem)] rounded-2xl border border-white/[0.08] bg-card p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {targetLanguage === 'hi' ? 'Hindi' : 'English'}
            </p>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-muted hover:text-foreground cursor-pointer"
              aria-label="Close translation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              {translate('translate.translating')}
            </div>
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
              {translated}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
