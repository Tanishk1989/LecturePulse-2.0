const DB_NAME = 'lecturepulse-offline'
const STORE_NAME = 'recordings'
const DB_VERSION = 1

export interface OfflineRecording {
  id: string
  title: string
  duration: number
  subject?: string
  mimeType: string
  transcriptText?: string
  createdAt: string
  blob: Blob
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

export async function queueOfflineRecording(recording: OfflineRecording): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(recording)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listOfflineRecordings(): Promise<OfflineRecording[]> {
  const db = await openDb()
  const rows = await new Promise<OfflineRecording[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result as OfflineRecording[])
    request.onerror = () => reject(request.error)
  })
  db.close()
  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function removeOfflineRecording(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function countOfflineRecordings(): Promise<number> {
  const rows = await listOfflineRecordings()
  return rows.length
}
