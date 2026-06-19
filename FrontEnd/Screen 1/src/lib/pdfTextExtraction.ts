import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const MAX_PAGES = 80
const MAX_CHARS = 120_000

let workerReady = false

function ensureWorker(): void {
  if (workerReady) return
  GlobalWorkerOptions.workerSrc = pdfWorker
  workerReady = true
}

async function extractFromDocument(pdf: PDFDocumentProxy): Promise<string> {
  const pagesToRead = Math.min(pdf.numPages, MAX_PAGES)
  const chunks: string[] = []

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (pageText) chunks.push(pageText)
  }

  return chunks.join('\n\n').slice(0, MAX_CHARS).trim()
}

export async function extractTextFromPdfFile(file: File): Promise<string> {
  ensureWorker()
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  return extractFromDocument(pdf)
}

export async function extractTextFromPdfUrl(url: string): Promise<string> {
  ensureWorker()
  const pdf = await getDocument({ url }).promise
  return extractFromDocument(pdf)
}
