import * as fs from 'fs'
import * as path from 'path'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const MAX_UPLOAD_BYTES = 48 * 1024 * 1024
const STORAGE_BUCKET = 'lecturepulse-private'
const MEDIA_URL_TTL_SECONDS = 6 * 60 * 60
const signingKey = process.env.SUPABASE_SERVICE_ROLE_KEY || randomBytes(32).toString('hex')
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export async function initializeStorage(): Promise<void> {
  ensureUploadDirs()
  if (!supabase) {
    if (process.env.NODE_ENV === 'production') throw new Error('Durable storage credentials are missing.')
    return
  }
  const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET)
  if (data) {
    if (data.public) throw new Error('Lecture storage bucket must be private.')
  } else {
    if (error && !/not found/i.test(error.message)) throw new Error('Could not inspect durable storage.')
    const created = await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: false, fileSizeLimit: MAX_UPLOAD_BYTES,
    })
    if (created.error) throw new Error('Could not create private lecture storage.')
  }
  // Older releases stored files in these buckets. Keep those files, restrict access.
  for (const category of [LECTURES_CATEGORY, DOCUMENTS_CATEGORY]) {
    const legacy = await supabase.storage.getBucket(category)
    if (legacy.data?.public) {
      const updated = await supabase.storage.updateBucket(category, { public: false })
      if (updated.error) throw new Error('Could not protect legacy lecture storage.')
    }
  }
}

export function storageMode(): string { return supabase ? 'supabase-private' : 'local-development' }

export const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
export const LECTURES_CATEGORY = 'lectures'
export const DOCUMENTS_CATEGORY = 'documents'
export const AVATARS_CATEGORY = 'avatars'

function assertCategory(category: string): void {
  if (![LECTURES_CATEGORY, DOCUMENTS_CATEGORY, AVATARS_CATEGORY].includes(category)) {
    throw new Error('Invalid upload category.')
  }
}

export function normalizeRelativePath(relativePath: string): string {
  if (
    !relativePath ||
    relativePath.includes('\\') ||
    relativePath.includes('\0') ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath)
  ) {
    throw new Error('Invalid file path.')
  }

  const segments = relativePath.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..' || /[\u0000-\u001f<>:"|?*]/.test(segment))) {
    throw new Error('Invalid file path.')
  }

  return segments.join('/')
}

function isWithinDirectory(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)
}

export function ensureUploadDirs(): void {
  for (const category of [LECTURES_CATEGORY, DOCUMENTS_CATEGORY, AVATARS_CATEGORY]) {
    fs.mkdirSync(path.join(UPLOADS_ROOT, category), { recursive: true })
  }
}

export function getPublicBaseUrl(): string {
  const port = process.env.PORT || 5000
  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`
  return base.replace(/\/$/, '')
}

export function buildFileUrl(category: string, relativePath: string): string {
  assertCategory(category)
  const normalized = normalizeRelativePath(relativePath)
  const encoded = normalized.split('/').map(encodeURIComponent).join('/')
  return `${getPublicBaseUrl()}/uploads/${category}/${encoded}`
}

export function getAbsolutePath(category: string, relativePath: string): string {
  assertCategory(category)
  const normalized = normalizeRelativePath(relativePath)
  const categoryRoot = path.resolve(UPLOADS_ROOT, category)
  const absolute = path.resolve(categoryRoot, ...normalized.split('/'))

  if (!isWithinDirectory(categoryRoot, absolute)) {
    throw new Error('Invalid file path.')
  }

  return absolute
}

export function resolveLocalPathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    if (url.origin !== new URL(getPublicBaseUrl()).origin || !url.pathname.startsWith('/uploads/')) return null

    const [category, ...segments] = url.pathname.slice('/uploads/'.length).split('/')
    const relativePath = segments.map(decodeURIComponent).join('/')
    return getAbsolutePath(category, relativePath)
  } catch {
    return null
  }
}

export function parseStoredFileUrl(fileUrl: string): { category: string; relativePath: string } | null {
  try {
    const url = new URL(fileUrl)
    let parts: string[]
    if (resolveLocalPathFromUrl(fileUrl)) {
      parts = url.pathname.slice('/uploads/'.length).split('/')
    } else if (process.env.SUPABASE_URL && url.origin === new URL(process.env.SUPABASE_URL).origin &&
      /^\/storage\/v1\/object\/(public|sign)\//.test(url.pathname)) {
      parts = url.pathname.split('/').slice(5)
    } else {
      return null
    }
    const [category, ...segments] = parts
    const relativePath = segments.map(decodeURIComponent).join('/')
    getAbsolutePath(category, relativePath)
    return { category, relativePath }
  } catch { return null }
}

export function canonicalOwnedFileUrl(fileUrl: string, userId: string): string {
  const stored = parseStoredFileUrl(fileUrl)
  if (!stored) throw new Error('Invalid uploaded file URL.')
  assertUserOwnsRelativePath(userId, stored.relativePath)
  return buildFileUrl(stored.category, stored.relativePath)
}

function mediaSignature(category: string, relativePath: string, expires: string): string {
  return createHmac('sha256', signingKey).update(`${category}/${relativePath}\n${expires}`).digest('hex')
}

export function getAccessibleFileUrl(fileUrl: string, userId?: string): string {
  const stored = parseStoredFileUrl(fileUrl)
  if (!stored) return fileUrl
  if (userId) {
    try { assertUserOwnsRelativePath(userId, stored.relativePath) } catch { return '' }
  }
  const base = buildFileUrl(stored.category, stored.relativePath)
  if (stored.category === AVATARS_CATEGORY) return base
  const expires = String(Math.floor(Date.now() / 1000) + MEDIA_URL_TTL_SECONDS)
  return `${base}?expires=${expires}&signature=${mediaSignature(stored.category, stored.relativePath, expires)}`
}

export function verifyMediaSignature(category: string, relativePath: string, expires: string, signature: string): boolean {
  if (!/^\d+$/.test(expires) || Number(expires) <= Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(signature)) return false
  const expected = mediaSignature(category, relativePath, expires)
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
}

export async function storeFile(category: string, relativePath: string, sourcePath: string, contentType: string): Promise<void> {
  const target = getAbsolutePath(category, relativePath)
  if (fs.statSync(sourcePath).size > MAX_UPLOAD_BYTES) throw new Error('File exceeds the 48 MB upload limit.')
  if (supabase) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(
      `${category}/${normalizeRelativePath(relativePath)}`, fs.createReadStream(sourcePath),
      { contentType, upsert: true, duplex: 'half' },
    )
    if (error) throw new Error('Durable upload failed. Please try again.')
    return
  }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  if (path.resolve(sourcePath) === target) return
  fs.copyFileSync(sourcePath, target)
}

export async function getStorageDownloadUrl(category: string, relativePath: string): Promise<string | null> {
  getAbsolutePath(category, relativePath)
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(`${category}/${relativePath}`, MEDIA_URL_TTL_SECONDS)
  if (data && !error) return data.signedUrl
  const legacy = await supabase.storage.from(category).createSignedUrl(relativePath, MEDIA_URL_TTL_SECONDS)
  if (legacy.error || !legacy.data) throw new Error('File is unavailable. Please upload it again.')
  return legacy.data.signedUrl
}

export function assertUserOwnsRelativePath(userId: string, relativePath: string): void {
  const normalized = normalizeRelativePath(relativePath)
  if (normalized.split('/')[0] !== userId || normalized.split('/').length < 2) {
    throw new Error('Access denied.')
  }
}

export async function deleteFileByUrl(fileUrl: string, userId: string): Promise<boolean> {
  const stored = parseStoredFileUrl(fileUrl)
  if (!stored) return false
  try {
    assertUserOwnsRelativePath(userId, stored.relativePath)
  } catch {
    return false
  }

  if (supabase && stored) {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([`${stored.category}/${stored.relativePath}`])
    if (error) throw new Error('Could not delete stored file.')
    const legacy = await supabase.storage.getBucket(stored.category)
    if (legacy.data) {
      const removed = await supabase.storage.from(stored.category).remove([stored.relativePath])
      if (removed.error) throw new Error('Could not delete legacy stored file.')
    }
  }
  const localPath = resolveLocalPathFromUrl(fileUrl)
  if (!localPath || !fs.existsSync(localPath)) {
    return Boolean(supabase && stored)
  }

  fs.unlinkSync(localPath)
  return true
}

export async function readFileBufferFromUrl(fileUrl: string): Promise<Buffer> {
  const stored = parseStoredFileUrl(fileUrl)
  if (stored && supabase) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(`${stored.category}/${stored.relativePath}`)
    if (data && !error) return Buffer.from(await data.arrayBuffer())
    const legacy = await supabase.storage.from(stored.category).download(stored.relativePath)
    if (legacy.error || !legacy.data) throw new Error('File is unavailable. Please upload it again.')
    return Buffer.from(await legacy.data.arrayBuffer())
  }
  const localPath = resolveLocalPathFromUrl(fileUrl)
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath)
  }

  // External audio URLs are produced only by the YouTube resolver.
  const remote = new URL(fileUrl)
  if (remote.protocol !== 'https:' || !remote.hostname.endsWith('.googlevideo.com')) {
    throw new Error('File is unavailable. Please upload it again.')
  }
  const response = await fetch(fileUrl, { redirect: 'error', signal: AbortSignal.timeout(120000) })
  if (!response.ok) {
    throw new Error(`Failed to fetch file (${response.status}).`)
  }

  return Buffer.from(await response.arrayBuffer())
}
