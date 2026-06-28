import { execFile, execFileSync } from 'child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const INPUT_EXTENSIONS = ['webm', 'mp4', 'm4a', 'mp3', 'ogg', 'wav', 'mpeg', 'mkv'] as const

function discoverFfmpegFromWinGet(): string | null {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) return null

  const packagesDir = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages')
  if (!existsSync(packagesDir)) return null

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.toLowerCase().includes('ffmpeg')) continue

    const packageDir = path.join(packagesDir, entry.name)
    for (const sub of readdirSync(packageDir, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue
      const candidate = path.join(packageDir, sub.name, 'bin', 'ffmpeg.exe')
      if (existsSync(candidate)) return candidate
    }
  }

  return null
}

function discoverFfmpegCommand(): string | null {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH
  }

  const wingetPath = discoverFfmpegFromWinGet()
  if (wingetPath) return wingetPath

  const candidates = ['ffmpeg', 'ffmpeg.exe']
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['-version'], { windowsHide: true, stdio: 'ignore' })
      return candidate
    } catch {
      // try next
    }
  }

  return null
}

export function isFfmpegAvailable(): boolean {
  return discoverFfmpegCommand() !== null
}

export async function convertBufferToMonoWav(buffer: Buffer, inputExt: string): Promise<Buffer> {
  const ffmpeg = discoverFfmpegCommand()
  if (!ffmpeg) {
    throw new Error(
      'This lecture file is too large to transcribe directly. Install ffmpeg on the server or upload a shorter clip.',
    )
  }

  const safeExt = INPUT_EXTENSIONS.includes(inputExt as (typeof INPUT_EXTENSIONS)[number])
    ? inputExt
    : 'bin'
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lp-audio-'))
  const inputPath = path.join(tempDir, `input.${safeExt}`)
  const outputPath = path.join(tempDir, 'output.wav')

  try {
    writeFileSync(inputPath, buffer)
    await execFileAsync(
      ffmpeg,
      ['-y', '-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'wav', outputPath],
      { timeout: 300_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    )

    if (!existsSync(outputPath)) {
      throw new Error('Audio conversion failed.')
    }

    return readFileSync(outputPath)
  } finally {
    for (const file of [inputPath, outputPath]) {
      try {
        unlinkSync(file)
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
