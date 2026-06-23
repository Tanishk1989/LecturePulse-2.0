import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLectures } from '@/hooks/useLectures'
import { useToast } from '@/components/ui/ToastProvider'
import { clearUserPreferences } from '@/lib/userPreferences'
import { deleteLecture } from '@/services/lectureService'
import {
  deleteFirebaseAccount,
  hasPasswordProvider,
  isGoogleOnlyUser,
  deleteUserProfile,
} from '@/services/profileService'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { cn } from '@/lib/utils'

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
}

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const { user } = useAuth()
  const { lectures } = useLectures()
  const { toast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const needsPassword = user ? hasPasswordProvider(user) : false
  const confirmValid = confirmText.trim().toUpperCase() === 'DELETE'

  useEffect(() => {
    if (open) {
      setConfirmText('')
      setPassword('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleDelete = async () => {
    if (!user || !confirmValid) return
    setDeleting(true)

    try {
      for (const lecture of lectures) {
        await deleteLecture(user.uid, lecture.id)
      }
      clearUserPreferences(user.uid)
      try {
        await deleteUserProfile()
      } catch (err) {
        console.error('Failed to delete database profile:', err)
      }
      await deleteFirebaseAccount(needsPassword ? password : undefined)
      toast.success('Your account has been deleted.')
      onClose()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-md rounded-2xl border border-red/25 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-muted hover:text-foreground cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-heading text-xl text-red">Delete account</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              This permanently removes all your lectures, notes, and flashcards. This action
              cannot be undone.
            </p>

            <div className="mt-5 space-y-4">
              {needsPassword && (
                <label className="block">
                  <span className="text-xs text-muted">Current password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-red/30"
                  />
                </label>
              )}

              {user && isGoogleOnlyUser(user) && (
                <p className="text-xs text-muted">
                  You may need to sign in again before your auth account can be fully removed.
                </p>
              )}

              <label className="block">
                <span className="text-xs text-muted">
                  Type <span className="font-mono text-foreground">DELETE</span> to confirm
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-red/30"
                />
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                className="flex-1 rounded-xl border border-white/[0.1] py-2.5 text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={!confirmValid || deleting || (needsPassword && !password)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl bg-red/90 py-2.5 text-sm font-medium text-white',
                  'hover:bg-red transition-colors cursor-pointer disabled:opacity-40',
                )}
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete account
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
