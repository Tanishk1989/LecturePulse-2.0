export interface WavHeaderInfo {
  numChannels: number
  sampleRate: number
  byteRate: number
  blockAlign: number
  bitsPerSample: number
  dataOffset: number
  dataSize: number
  duration: number
}

// Walk RIFF chunks, including padding. Never search for chunk names inside payloads.
export function parseWavHeader(buffer: Buffer): WavHeaderInfo | null {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') return null
  const riffEnd = buffer.readUInt32LE(4) + 8
  if (riffEnd > buffer.length || riffEnd < 44) return null
  let format: Omit<WavHeaderInfo, 'dataOffset' | 'dataSize' | 'duration'> | undefined
  let data: { dataOffset: number; dataSize: number } | undefined
  for (let offset = 12; offset + 8 <= riffEnd;) {
    const id = buffer.toString('ascii', offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    const end = offset + 8 + size
    if (end > riffEnd) return null
    if (id === 'fmt ') {
      if (size < 16 || buffer.readUInt16LE(offset + 8) !== 1) return null
      const numChannels = buffer.readUInt16LE(offset + 10)
      const sampleRate = buffer.readUInt32LE(offset + 12)
      const byteRate = buffer.readUInt32LE(offset + 16)
      const blockAlign = buffer.readUInt16LE(offset + 20)
      const bitsPerSample = buffer.readUInt16LE(offset + 22)
      if (!numChannels || !sampleRate || ![8, 16, 24, 32].includes(bitsPerSample) ||
          blockAlign !== numChannels * bitsPerSample / 8 || byteRate !== sampleRate * blockAlign) return null
      format = { numChannels, sampleRate, byteRate, blockAlign, bitsPerSample }
    } else if (id === 'data' && !data) {
      data = { dataOffset: offset, dataSize: size }
    }
    offset = end + (size % 2)
  }
  if (!format || !data || !data.dataSize || data.dataSize % format.blockAlign) return null
  return { ...format, ...data, duration: data.dataSize / format.byteRate }
}

export interface WavChunk { buffer: Buffer; startSeconds: number }

export function splitWavBuffer(buffer: Buffer, info: WavHeaderInfo, maxBytes: number, maxSeconds = 360): WavChunk[] {
  if (!Number.isFinite(maxBytes) || !Number.isFinite(maxSeconds) || maxSeconds <= 0) throw new Error('Invalid audio chunk limit.')
  const headerSize = 44
  const blockCount = Math.floor(Math.min(maxBytes - headerSize - 1, info.byteRate * maxSeconds) / info.blockAlign)
  if (blockCount < 1) throw new Error('Audio chunk limit is too small.')
  const chunkSize = blockCount * info.blockAlign
  const chunks: WavChunk[] = []
  for (let consumed = 0; consumed < info.dataSize; consumed += chunkSize) {
    const size = Math.min(chunkSize, info.dataSize - consumed)
    const padding = size % 2
    const chunk = Buffer.alloc(headerSize + size + padding)
    chunk.write('RIFF', 0)
    chunk.writeUInt32LE(chunk.length - 8, 4)
    chunk.write('WAVEfmt ', 8)
    chunk.writeUInt32LE(16, 16)
    chunk.writeUInt16LE(1, 20)
    chunk.writeUInt16LE(info.numChannels, 22)
    chunk.writeUInt32LE(info.sampleRate, 24)
    chunk.writeUInt32LE(info.byteRate, 28)
    chunk.writeUInt16LE(info.blockAlign, 32)
    chunk.writeUInt16LE(info.bitsPerSample, 34)
    chunk.write('data', 36)
    chunk.writeUInt32LE(size, 40)
    buffer.copy(chunk, headerSize, info.dataOffset + 8 + consumed, info.dataOffset + 8 + consumed + size)
    chunks.push({ buffer: chunk, startSeconds: consumed / info.byteRate })
  }
  return chunks
}
