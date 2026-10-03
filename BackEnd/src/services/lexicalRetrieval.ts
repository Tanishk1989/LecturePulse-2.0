// BM25 keyword scores, not semantic embeddings.
const STOP_WORDS = new Set('a an and are as at be by can do does explain for from how i in is it me my of on or please the this to what why with you your'.split(' '))
export function tokenize(text: string): string[] {
  return (text.normalize('NFKC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter(term => !STOP_WORDS.has(term))
}
export function chunkTranscript(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  for (let start = 0; start < words.length; start += 140) {
    chunks.push(words.slice(start, start + 180).join(' '))
    if (start + 180 >= words.length) break
  }
  return chunks
}
export interface RetrievalChunk { text: string; lectureId: string; lectureTitle: string }
export function rankChunks(question: string, chunks: RetrievalChunk[], topK = 6) {
  const terms = [...new Set(tokenize(question))]
  const limit = Number.isFinite(topK) ? Math.max(1, Math.min(20, Math.floor(topK))) : 6
  if (!terms.length || !chunks.length) return []
  const documents = chunks.map(chunk => tokenize(chunk.text))
  const averageLength = documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length || 1
  const frequencies = new Map(terms.map(term => [term, documents.filter(doc => doc.includes(term)).length]))
  return chunks.map((chunk, index) => {
    const doc = documents[index]
    let score = 0
    for (const term of terms) {
      const count = doc.filter(token => token === term).length
      if (!count) continue
      const df = frequencies.get(term) ?? 0
      const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5))
      score += idf * (count * 2.2) / (count + 1.2 * (0.25 + 0.75 * doc.length / averageLength))
    }
    return { ...chunk, score }
  }).filter(chunk => chunk.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}
