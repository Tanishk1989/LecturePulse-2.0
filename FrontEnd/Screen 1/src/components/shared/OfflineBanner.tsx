import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { cn } from '@/lib/utils'
import { CloudOff, Loader2, RefreshCw } from 'lucide-react'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const { pendingCount, syncing, syncQueue } = useOfflineSync()

  if (online && pendingCount === 0) return null

  return (
    <div
      className={cn(
        'fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md',
        online
          ? 'border-accent/25 bg-accent/[0.1] text-accent'
          : 'border-amber-400/30 bg-amber-400/[0.1] text-amber-200',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5" />
            Offline — recordings will sync when you reconnect
          </>
        ) : syncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing {pendingCount} offline recording{pendingCount === 1 ? '' : 's'}…
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            {pendingCount} recording{pendingCount === 1 ? '' : 's'} waiting to sync
            <button
              type="button"
              onClick={() => void syncQueue()}
              className="ml-1 underline cursor-pointer hover:opacity-80"
            >
              Sync now
            </button>
          </>
        )}
      </div>
    </div>
  )
}
