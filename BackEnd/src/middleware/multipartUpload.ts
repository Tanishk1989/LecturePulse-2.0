import multer from 'multer'
import { randomUUID } from 'crypto'

export function createIncomingUpload(destination: string, maxBytes: number) {
  return multer({
    storage: multer.diskStorage({ destination, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
    limits: { fileSize: maxBytes, files: 1, fields: 2, parts: 3, fieldSize: 4096, fieldNameSize: 100 },
  })
}
