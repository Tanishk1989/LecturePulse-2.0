import { apiFetch, ApiError } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { loadUserPreferences, saveUserPreferences } from '@/lib/userPreferences'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
async function registration() {
  const active = await navigator.serviceWorker.register('/sw.js')
  if (active.active) return active
  return navigator.serviceWorker.ready
}
function serverKey(key: string): ArrayBuffer {
  const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')), char=>char.charCodeAt(0))
  return bytes.buffer
}
export async function enableServerPush(uid: string, askPermission = true) {
  if (!pushSupported()) throw Error('Push is not supported here. Use a supported browser; on iPhone install this site to the Home Screen.')
  if (Notification.permission !== 'granted') {
    if (!askPermission || await Notification.requestPermission() !== 'granted') throw Error('Allow notifications in your browser settings first.')
  }
  const config=await apiFetch<{publicKey:string}>('/push/config')
  if (auth.currentUser?.uid !== uid) return
  const worker=await registration()
  let subscription=await worker.pushManager.getSubscription()
  const owner=localStorage.getItem('lecturepulse:push-owner')
  if (subscription && owner !== uid) {await subscription.unsubscribe();subscription=null}
  if (!subscription) subscription=await worker.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:serverKey(config.publicKey)})
  try {
    await apiFetch('/push/subscribe',{method:'POST',body:JSON.stringify({subscription:subscription.toJSON()})})
  } catch(error) {
    if (error instanceof ApiError && error.status===409) {
      await subscription.unsubscribe()
      localStorage.removeItem('lecturepulse:push-owner')
    }
    throw error
  }
  localStorage.setItem('lecturepulse:push-owner',uid)
}
export async function disableServerPush() {
  if (!pushSupported()) return
  const worker=await navigator.serviceWorker.getRegistration()
  const subscription=await worker?.pushManager.getSubscription()
  if (!subscription) return
  // Unsubscribe from the browser even when an expired login prevents server cleanup.
  try {await apiFetch('/push/unsubscribe',{method:'POST',body:JSON.stringify({endpoint:subscription.endpoint})})}
  finally {await subscription.unsubscribe();localStorage.removeItem('lecturepulse:push-owner')}
}
export async function setPushEnabled(uid:string,enabled:boolean) {
  if (enabled) await enableServerPush(uid)
  else await disableServerPush()
  const prefs=loadUserPreferences(uid)
  saveUserPreferences(uid,{...prefs,notifications:{...prefs.notifications,pushEnabled:enabled}})
}
export async function testServerPush() {await apiFetch('/push/test',{method:'POST',body:'{}'})}
