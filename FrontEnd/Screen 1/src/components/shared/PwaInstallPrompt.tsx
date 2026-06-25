import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)

    const handler = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone || dismissed || !deferred) return null

  const handleInstall = async () => {
    await deferred.prompt()
    setDeferred(null)
    setDismissed(true)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-xs rounded-2xl border border-white/[0.1] bg-card/95 p-4 shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-muted hover:text-foreground cursor-pointer"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.08]">
          <Download className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Install LecturePulse</p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Add to your home screen for mobile recording with a full-screen app experience.
          </p>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className={cn(
              'mt-3 rounded-full bg-accent px-4 py-2 text-xs font-medium text-background cursor-pointer',
              'hover:bg-accent-soft transition-colors',
            )}
          >
            Install app
          </button>
        </div>
      </div>
    </div>
  )
}
