import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { loadUserPreferences } from '@/lib/userPreferences'
import { subscribeSyncedValue } from '@/lib/accountSync'
import { disableServerPush, enableServerPush, pushSupported } from '@/services/pushService'

export function PushRegistrationService() {
  const {user}=useAuth()
  useEffect(()=>{
    if (!user || !pushSupported()) return
    let busy=false,stopped=false
    const restore=async()=>{
      if (busy||stopped) return
      busy=true
      try {
        if (loadUserPreferences(user.uid).notifications.pushEnabled && Notification.permission==='granted') await enableServerPush(user.uid,false)
        else if (localStorage.getItem('lecturepulse:push-owner')===user.uid) await disableServerPush()
      } catch { /* Settings exposes explicit retry/test; never prompt automatically. */ }
      finally {busy=false}
    }
    void restore()
    const unsubscribe=subscribeSyncedValue(user.uid,'preferences',()=>{void restore()})
    window.addEventListener('online',restore)
    return ()=>{stopped=true;unsubscribe();window.removeEventListener('online',restore)}
  },[user?.uid])
  return null
}
