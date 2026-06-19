import { extractPdfTextFromUrl } from '../_shared/pdfExtract.ts'
import { serveProtectedFunction } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'

serveProtectedFunction('extract-pdf-text', 20, async (req) => {
  const { pdfUrl } = await req.json()

  if (!pdfUrl || typeof pdfUrl !== 'string') {
    return jsonResponse({ error: 'pdfUrl is required.' }, 400)
  }

  const { text, pageCount } = await extractPdfTextFromUrl(pdfUrl)
  return jsonResponse({ text, pageCount, pagesExtracted: pageCount })
})
