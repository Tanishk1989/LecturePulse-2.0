import { extractText, getDocumentProxy } from 'npm:unpdf@0.12.1'

const MAX_PAGES = 80

export async function extractPdfTextFromUrl(pdfUrl: string): Promise<{
  text: string
  pageCount: number | null
}> {
  const response = await fetch(pdfUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF (${response.status}).`)
  }

  const buffer = await response.arrayBuffer()
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const pageCount = pdf.numPages ?? 0
  const pagesToRead = Math.min(pageCount, MAX_PAGES)

  const { text, totalPages } = await extractText(pdf, { mergePages: true })
  const cleaned = text.replace(/\s+/g, ' ').trim()

  if (!cleaned) {
    throw new Error('No readable text found in this PDF.')
  }

  return {
    text: cleaned,
    pageCount: totalPages ?? pageCount ?? pagesToRead,
  }
}
