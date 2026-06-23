export const ACCEPTED_UPLOAD_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.pdf'] as const

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'video/mp4',
  'application/pdf',
] as const

const EXTENSION_KIND: Record<string, 'audio' | 'video' | 'pdf'> = {
  '.mp3': 'audio',
  '.wav': 'audio',
  '.m4a': 'audio',
  '.mp4': 'video',
  '.pdf': 'pdf',
}

export function getFileExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index).toLowerCase() : ''
}

export function getMediaKind(file: File): 'audio' | 'video' | 'pdf' | null {
  const extension = getFileExtension(file.name)
  if (extension in EXTENSION_KIND) {
    return EXTENSION_KIND[extension]
  }

  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  if (file.type === 'application/pdf') return 'pdf'
  return null
}

export function isAcceptedUploadFile(file: File): boolean {
  const kind = getMediaKind(file)
  return kind !== null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getMediaDuration(file: File): Promise<number> {
  const kind = getMediaKind(file)
  if (kind !== 'audio' && kind !== 'video') {
    return Promise.resolve(0)
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const element = document.createElement(kind === 'video' ? 'video' : 'audio')
    element.preload = 'metadata'

    const finish = (duration: number) => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(duration) ? Math.floor(duration) : 0)
    }

    element.onloadedmetadata = () => finish(element.duration)
    element.onerror = () => finish(0)
    element.src = url
  })
}

export async function getPdfPageCount(file: File): Promise<number | null> {
  try {
    const tail = await file.slice(Math.max(0, file.size - 65536)).arrayBuffer()
    const text = new TextDecoder('latin1').decode(tail)
    const matches = [...text.matchAll(/\/Count\s+(\d+)/g)]
    if (matches.length === 0) return null
    const last = matches[matches.length - 1]
    return last ? parseInt(last[1], 10) : null
  } catch {
    return null
  }
}

export async function analyzeUploadFile(file: File) {
  const mediaKind = getMediaKind(file)
  if (!mediaKind) {
    throw new Error('Unsupported file type')
  }

  const [duration, pageCount] = await Promise.all([
    getMediaDuration(file),
    mediaKind === 'pdf' ? getPdfPageCount(file) : Promise.resolve(null),
  ])

  return {
    mediaKind,
    duration,
    pageCount,
    fileSize: file.size,
    mimeType: file.type || undefined,
    originalFilename: file.name,
  }
}

export function deriveLectureTitle(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return baseName ? `🎙 ${baseName}` : '🎙 Uploaded Lecture'
}

export const UPLOAD_ACCEPT_STRING = ACCEPTED_UPLOAD_EXTENSIONS.join(',')

export async function extractAudioToWav(file: File | Blob): Promise<Blob> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const arrayBuffer = await file.arrayBuffer()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  // Downsample to 16000Hz mono
  const targetSampleRate = 16000
  const offlineCtx = new OfflineAudioContext(
    1, // mono
    Math.round(audioBuffer.duration * targetSampleRate),
    targetSampleRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer
  source.connect(offlineCtx.destination)
  source.start()

  const renderedBuffer = await offlineCtx.startRendering()
  return audioBufferToWav(renderedBuffer)
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // 1 = raw PCM (16-bit integer)
  const bitDepth = 16

  let result
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
  } else {
    result = buffer.getChannelData(0)
  }

  const bufferArr = new ArrayBuffer(44 + result.length * 2)
  const view = new DataView(bufferArr)

  // RIFF identifier
  writeString(view, 0, 'RIFF')
  // file length
  view.setUint32(4, 36 + result.length * 2, true)
  // RIFF type
  writeString(view, 8, 'WAVE')
  // format chunk identifier
  writeString(view, 12, 'fmt ')
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (raw)
  view.setUint16(20, format, true)
  // channel count
  view.setUint16(22, numOfChan, true)
  // sample rate
  view.setUint32(24, sampleRate, true)
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true)
  // block align (channel count * bytes per sample)
  view.setUint16(32, numOfChan * (bitDepth / 8), true)
  // bits per sample
  view.setUint16(34, bitDepth, true)
  // data chunk identifier
  writeString(view, 36, 'data')
  // data chunk length
  view.setUint32(40, result.length * 2, true)

  floatTo16BitPCM(view, 44, result)

  return new Blob([view], { type: 'audio/wav' })
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length
  const result = new Float32Array(length)

  let index = 0
  let inputIndex = 0

  while (index < length) {
    result[index++] = inputL[inputIndex]
    result[index++] = inputR[inputIndex]
    inputIndex++
  }
  return result
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
