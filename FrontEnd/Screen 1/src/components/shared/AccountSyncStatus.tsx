import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { startAccountSync } from '@/lib/accountSync'

export function AccountSyncStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'syncing' | 'saved' | 'offline' | 'error'>('syncing')
  useEffect(() => { if (user) return startAccountSync(user.uid, setStatus) }, [user?.uid])
  if (!user || status === 'saved') return null
  return <div role="status" className="fixed bottom-3 left-3 z-50 max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
    {status === 'syncing' ? 'Syncing account data…' : status === 'offline' ? 'Offline — edits saved on this device, sync resumes online.' : 'Cloud sync unavailable — local edits kept; retrying automatically.'}
  </div>
}
