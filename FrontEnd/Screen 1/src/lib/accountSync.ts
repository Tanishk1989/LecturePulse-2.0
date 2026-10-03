import { apiFetch, ApiError } from '@/lib/api'
import { auth } from '@/lib/firebase'
import { mergeSyncedData } from './syncMerge'

type Document = { key: string; data: any; revision: number }
type Meta = { revision: number; base: any; dirty: boolean }
const eventName = 'lecturepulse:account-data-changed'
let syncNow: (() => void) | undefined
const suspendedUsers = new Set<string>()
const activeDocuments = new Set<string>()

export function protectSyncedDocument(uid: string, key: string) {
  const id = `${uid}:${key}`
  activeDocuments.add(id)
  return () => { activeDocuments.delete(id); syncNow?.() }
}

// Pause in-flight sync before an explicitly confirmed account deletion.
export function suspendAccountSync(uid: string) {
  suspendedUsers.add(uid)
  return () => { suspendedUsers.delete(uid); syncNow?.() }
}

export function clearAccountSyncCache(uid: string) {
  const prefixes = ['lecturepulse:prefs:', 'lecturepulse:timetable:', 'lecturepulse:tutor:recent_topics:', 'lecturepulse:tutor:history:', 'lecturepulse:sync-meta:', 'lecturepulse:sync-legacy:']
  const ownedKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
    .filter(key => prefixes.some(prefix => key === `${prefix}${uid}` || key.startsWith(`${prefix}${uid}:`)))
  for (const key of ownedKeys) localStorage.removeItem(key)
}

export function syncStorageKey(uid: string, key: string): string {
  if (key === 'preferences') return `lecturepulse:prefs:${uid}`
  if (key === 'timetable') return `lecturepulse:timetable:${uid}`
  if (key === 'tutor-recent') return `lecturepulse:tutor:recent_topics:${uid}`
  return `lecturepulse:tutor:history:${uid}:${key.slice('tutor-history:'.length)}`
}
const metaKey = (uid: string, key: string) => `lecturepulse:sync-meta:${uid}:${key}`
function read(key: string, fallback: any = null): any { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
const metadata = (uid: string, key: string): Meta => read(metaKey(uid, key), { revision: 0, base: null, dirty: false })
function notify(uid: string, key: string, remote: boolean) { window.dispatchEvent(new CustomEvent(eventName, { detail: { uid, key, remote } })) }

export function writeSyncedValue(uid: string, key: string, data: any) {
  const storage = syncStorageKey(uid, key)
  const serialized = JSON.stringify(data)
  if (localStorage.getItem(storage) === serialized) return
  localStorage.setItem(storage, serialized)
  localStorage.setItem(metaKey(uid, key), JSON.stringify({ ...metadata(uid, key), dirty: true }))
  notify(uid, key, false)
  syncNow?.()
}

export function subscribeSyncedValue(uid: string, key: string, callback: () => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail
    if (detail?.uid === uid && detail?.key === key) callback()
  }
  const storageListener = (event: StorageEvent) => { if (event.key === syncStorageKey(uid, key)) callback() }
  window.addEventListener(eventName, listener)
  window.addEventListener('storage', storageListener)
  return () => { window.removeEventListener(eventName, listener); window.removeEventListener('storage', storageListener) }
}

export function normalizeTutorHistory(messages: any[]): any[] {
  const clean = messages.filter(message => ['user', 'assistant', 'context-notice'].includes(message?.role) && typeof message.content === 'string')
    .slice(-100).map(message => ({ id: message.id ?? crypto.randomUUID(), role: message.role, content: message.content.slice(0, 30_000), hasError: Boolean(message.hasError) }))
  while (JSON.stringify(clean).length > 95_000 && clean.length) clean.shift()
  return clean
}

export function startAccountSync(uid: string, onStatus: (status: 'syncing' | 'saved' | 'offline' | 'error') => void) {
  let stopped = false, busy = false
  let debounce: ReturnType<typeof setTimeout> | undefined
  const keys = () => {
    const result = new Set(['preferences', 'timetable', 'tutor-recent'])
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      const prefix = `lecturepulse:tutor:history:${uid}:`
      if (key.startsWith(prefix)) result.add(`tutor-history:${key.slice(prefix.length)}`)
    }
    return result
  }
  const validSession = () => !stopped && !suspendedUsers.has(uid) && auth.currentUser?.uid === uid
  const apply = (doc: Document, dirty = false) => {
    if (!validSession()) return
    localStorage.setItem(syncStorageKey(uid, doc.key), JSON.stringify(doc.data))
    localStorage.setItem(metaKey(uid, doc.key), JSON.stringify({ revision: doc.revision, base: doc.data, dirty }))
    notify(uid, doc.key, true)
  }
  const cycle = async () => {
    if (busy || !validSession()) return
    if (!navigator.onLine) { onStatus('offline'); return }
    busy = true
    onStatus('syncing')
    try {
      const cloud: Document[] = []
      let cursor: string | null = null
      do {
        const page: { documents: Document[]; nextCursor: string | null } = await apiFetch(`/user-sync${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
        if (!validSession()) return
        cloud.push(...page.documents)
        cursor = page.nextCursor
      } while (cursor)
      if (!validSession()) return
      const docs = new Map(cloud.map(doc => [doc.key, doc]))
      for (const key of new Set([...keys(), ...docs.keys()])) {
        if (!validSession()) return
        if (activeDocuments.has(`${uid}:${key}`)) continue
        const storage = syncStorageKey(uid, key)
        let local = read(storage)
        let meta = metadata(uid, key)
        const remote = docs.get(key)
        if (!localStorage.getItem(metaKey(uid, key)) && local !== null) {
          // Keep a local backup during first-time migration; an existing cloud preference wins.
          localStorage.setItem(`lecturepulse:sync-legacy:${uid}:${key}`, JSON.stringify(local))
          if (key.startsWith('tutor-history:')) local = normalizeTutorHistory(local)
          if (remote && key === 'preferences') { apply(remote); continue }
          meta = { revision: remote?.revision ?? 0, base: remote?.data ?? null, dirty: true }
          if (remote) local = mergeSyncedData(null, local, remote.data)
          localStorage.setItem(storage, JSON.stringify(local))
          localStorage.setItem(metaKey(uid, key), JSON.stringify(meta))
        }
        if (remote && !meta.dirty) { if (remote.revision !== meta.revision) apply(remote); continue }
        if (local === null || !meta.dirty) continue
        if (key.startsWith('tutor-history:')) local = normalizeTutorHistory(local)
        let base = meta.base, revision = meta.revision
        if (remote && remote.revision !== revision) { local = mergeSyncedData(base, local, remote.data); base = remote.data; revision = remote.revision }
        for (let attempt = 0; attempt < 3 && validSession(); attempt++) {
          const before = localStorage.getItem(storage)
          try {
            const saved = await apiFetch<Document>(`/user-sync/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ data: local, revision }) })
            if (!validSession()) return
            if (activeDocuments.has(`${uid}:${key}`)) break
            if (localStorage.getItem(storage) === before) apply(saved)
            else localStorage.setItem(metaKey(uid, key), JSON.stringify({ revision: saved.revision, base: saved.data, dirty: true }))
            break
          } catch (error) {
            if (error instanceof ApiError && error.status === 409 && attempt < 2) {
              const latest = await apiFetch<Document>(`/user-sync/${encodeURIComponent(key)}`)
              local = mergeSyncedData(base, read(storage), latest.data)
              base = latest.data; revision = latest.revision
            } else if (error instanceof ApiError && error.status === 404 && key.startsWith('tutor-history:')) {
              // Deleted/foreign lectures are not uploaded. Keep the original local backup.
              localStorage.setItem(metaKey(uid, key), JSON.stringify({ ...meta, dirty: false }))
              break
            } else throw error
          }
        }
      }
      onStatus([...keys()].some(key => metadata(uid, key).dirty) ? 'syncing' : 'saved')
    } catch { if (validSession()) onStatus(navigator.onLine ? 'error' : 'offline') }
    finally { busy = false }
  }
  const schedule = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { void cycle() }, 1000) }
  syncNow = schedule
  const interval = setInterval(() => { void cycle() }, 30_000)
  window.addEventListener('online', schedule)
  window.addEventListener('focus', schedule)
  void cycle()
  return () => {
    stopped = true
    if (syncNow === schedule) syncNow = undefined
    clearInterval(interval)
    if (debounce) clearTimeout(debounce)
    window.removeEventListener('online', schedule); window.removeEventListener('focus', schedule)
  }
}
