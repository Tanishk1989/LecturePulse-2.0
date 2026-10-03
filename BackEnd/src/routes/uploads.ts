import { Router, Response } from 'express'
import multer from 'multer'
import * as fs from 'fs'
import * as path from 'path'
import { createIncomingUpload } from '../middleware/multipartUpload'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import {
  AVATARS_CATEGORY,
  DOCUMENTS_CATEGORY,
  LECTURES_CATEGORY,
  UPLOADS_ROOT,
  assertUserOwnsRelativePath,
  buildFileUrl,
  ensureUploadDirs,
  getAbsolutePath,
  MAX_UPLOAD_BYTES,
  storeFile,
  deleteFileByUrl,
  getAccessibleFileUrl,
  getStorageDownloadUrl,
  verifyMediaSignature,
} from '../config/storage'
import { getSafeErrorMessage } from '../utils/apiError'

const router = Router()

ensureUploadDirs()
const incomingDir = path.join(UPLOADS_ROOT, '_incoming')
fs.mkdirSync(incomingDir, { recursive: true })
const maxUploadBytes = MAX_UPLOAD_BYTES

const upload = createIncomingUpload(incomingDir, maxUploadBytes)

router.post('/', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File exceeds the 48 MB upload limit.' })
    }
    if (error) return res.status(400).json({ error: 'Invalid upload.' })
    next()
  })
}, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' })
  }

  const relativePath = String(req.body.relativePath ?? '')
  const category = String(req.body.category ?? '')

  try {
    if (![LECTURES_CATEGORY, DOCUMENTS_CATEGORY, AVATARS_CATEGORY].includes(category)) {
      throw new Error('Invalid upload category.')
    }
    assertUserOwnsRelativePath(userId, relativePath)

    if (category === AVATARS_CATEGORY && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(req.file.mimetype)) {
      throw new Error('Use a JPG, PNG, WebP or GIF profile photo.')
    }
    await storeFile(category, relativePath, req.file.path, req.file.mimetype)

    res.status(201).json({
      fileUrl: buildFileUrl(category, relativePath),
      path: `${category}/${relativePath}`,
      category,
    })
  } catch (error) {
    console.error('[API] Upload failed:', error)
    return res.status(400).json({ error: getSafeErrorMessage(error, 'Upload failed.') })
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
  }
})

router.get('/url', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = String(req.query.category ?? '')
    const relativePath = String(req.query.relativePath ?? '')
    assertUserOwnsRelativePath(req.user!.uid, relativePath)
    res.json({ fileUrl: getAccessibleFileUrl(buildFileUrl(category, relativePath)) })
  } catch {
    res.status(400).json({ error: 'Invalid file path.' })
  }
})

router.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const { category, relativePath } = req.body as { category?: string; relativePath?: string }
  if (!relativePath) {
    return res.status(400).json({ error: 'relativePath is required.' })
  }

  const resolvedCategory = category ?? ''

  try {
    assertUserOwnsRelativePath(userId, relativePath)
    await deleteFileByUrl(buildFileUrl(resolvedCategory, relativePath), userId)
    res.json({ message: 'File deleted.' })
  } catch (error) {
    console.error('[API] Delete failed:', error)
    return res.status(400).json({ error: getSafeErrorMessage(error, 'Delete failed.') })
  }
})

export default router

export const mediaRouter = Router()
mediaRouter.get('/:category/*', async (req, res) => {
  try {
    const category = req.params.category
    const relativePath = (req.params as Record<string, string>)['0']
    const absolutePath = getAbsolutePath(category, relativePath)
    if (category !== AVATARS_CATEGORY && !verifyMediaSignature(category, relativePath,
      String(req.query.expires ?? ''), String(req.query.signature ?? ''))) {
      return res.status(403).json({ error: 'Sign in and reopen this file.' })
    }
    res.setHeader('Cache-Control', 'private, no-store')
    const remoteUrl = await getStorageDownloadUrl(category, relativePath)
    if (remoteUrl) return res.redirect(302, remoteUrl)
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File not found.' })
    return res.sendFile(absolutePath)
  } catch {
    return res.status(404).json({ error: 'File is unavailable. Please upload it again.' })
  }
})
