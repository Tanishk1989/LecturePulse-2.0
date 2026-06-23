import * as fs from 'fs'
import * as path from 'path'

export const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')
export const LECTURES_CATEGORY = 'lectures'
export const DOCUMENTS_CATEGORY = 'documents'

export function ensureUploadDirs(): void {
  for (const category of [LECTURES_CATEGORY, DOCUMENTS_CATEGORY]) {
    fs.mkdirSync(path.join(UPLOADS_ROOT, category), { recursive: true })
  }
}

export function getPublicBaseUrl(): string {
  const port = process.env.PORT || 5000
  const base = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`
  return base.replace(/\/$/, '')
}

export function buildFileUrl(category: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  return `${getPublicBaseUrl()}/uploads/${category}/${normalized}`
}

export function getAbsolutePath(category: string, relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const absolute = path.resolve(UPLOADS_ROOT, category, normalized)
  const uploadsRootResolved = path.resolve(UPLOADS_ROOT)

  if (!absolute.startsWith(uploadsRootResolved)) {
    throw new Error('Invalid file path.')
  }

  return absolute
}

export function resolveLocalPathFromUrl(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    const marker = '/uploads/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null

    const relative = url.pathname.slice(markerIndex + marker.length)
    const absolute = path.resolve(UPLOADS_ROOT, ...relative.split('/'))
    const uploadsRootResolved = path.resolve(UPLOADS_ROOT)

    if (!absolute.startsWith(uploadsRootResolved)) {
      return null
    }

    return absolute
  } catch {
    return null
  }
}

export function assertUserOwnsRelativePath(userId: string, relativePath: string): void {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized.startsWith(`${userId}/`)) {
    throw new Error('Access denied.')
  }
}

export function deleteFileByUrl(fileUrl: string): boolean {
  const localPath = resolveLocalPathFromUrl(fileUrl)
  if (!localPath || !fs.existsSync(localPath)) {
    return false
  }

  fs.unlinkSync(localPath)
  return true
}

export async function readFileBufferFromUrl(fileUrl: string): Promise<Buffer> {
  const localPath = resolveLocalPathFromUrl(fileUrl)
  if (localPath && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath)
  }

  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch file (${response.status}).`)
  }

  return Buffer.from(await response.arrayBuffer())
}
