import { Router, Response } from 'express'
import multer from 'multer'
import * as fs from 'fs'
import * as path from 'path'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import {
  DOCUMENTS_CATEGORY,
  LECTURES_CATEGORY,
  assertUserOwnsRelativePath,
  buildFileUrl,
  ensureUploadDirs,
  getAbsolutePath,
} from '../config/storage'
import { getSafeErrorMessage } from '../utils/apiError'

const router = Router()

ensureUploadDirs()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 500 },
})

router.post('/', requireAuth, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' })
  }

  const relativePath = String(req.body.relativePath ?? '')
  const category =
    req.body.category === DOCUMENTS_CATEGORY ? DOCUMENTS_CATEGORY : LECTURES_CATEGORY

  try {
    assertUserOwnsRelativePath(userId, relativePath)

    const absolutePath = getAbsolutePath(category, relativePath)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, req.file.buffer)

    res.status(201).json({
      fileUrl: buildFileUrl(category, relativePath),
      path: `${category}/${relativePath}`,
      category,
    })
  } catch (error) {
    console.error('[API] Upload failed:', error)
    return res.status(400).json({ error: getSafeErrorMessage(error, 'Upload failed.') })
  }
})

router.delete('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  const { category, relativePath } = req.body as { category?: string; relativePath?: string }
  if (!relativePath) {
    return res.status(400).json({ error: 'relativePath is required.' })
  }

  const resolvedCategory =
    category === DOCUMENTS_CATEGORY ? DOCUMENTS_CATEGORY : LECTURES_CATEGORY

  try {
    assertUserOwnsRelativePath(userId, relativePath)
    const absolutePath = getAbsolutePath(resolvedCategory, relativePath)
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath)
    }
    res.json({ message: 'File deleted.' })
  } catch (error) {
    console.error('[API] Delete failed:', error)
    return res.status(400).json({ error: getSafeErrorMessage(error, 'Delete failed.') })
  }
})

export default router
