import { execFile, execSync } from 'child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Innertube } from 'youtubei.js'
import { parseYouTubeVideoId } from './youtubeUtils'
import { LECTURES_CATEGORY, getAbsolutePath, buildFileUrl } from '../config/storage'
import { convertBufferToMonoWav, isFfmpegAvailable } from './audioConvertService'

const execFileAsync = promisify(execFile)

const YT_DLP_ARGS = ['--js-runtimes', 'node', '--remote-components', 'ejs:github']

type YtDlpRunner = { command: string; prefix: string[] }

function discoverYtDlpRunners(): YtDlpRunner[] {
  const runners: YtDlpRunner[] = []
  const seen = new Set<string>()

  const addRunner = (command: string, prefix: string[] = []) => {
    const key = `${command}|${prefix.join(' ')}`
    if (seen.has(key)) return
    seen.add(key)
    runners.push({ command, prefix })
  }

  if (process.env.YT_DLP_PATH) {
    addRunner(process.env.YT_DLP_PATH)
  }

  addRunner('yt-dlp')
  addRunner('python', ['-m', 'yt_dlp'])
  addRunner('python3', ['-m', 'yt_dlp'])

  try {
    const pythonPath = execSync('where python', { encoding: 'utf8', windowsHide: true })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)

    if (pythonPath) {
      const scriptsYtDlp = path.join(path.dirname(pythonPath), 'Scripts', 'yt-dlp.exe')
      if (existsSync(scriptsYtDlp)) {
        addRunner(scriptsYtDlp)
      }
    }
  } catch {
    // ignore lookup failures
  }

  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const pythonRoot = path.join(localAppData, 'Python')
    if (existsSync(pythonRoot)) {
      for (const entry of readdirSync(pythonRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const candidate = path.join(pythonRoot, entry.name, 'Scripts', 'yt-dlp.exe')
        if (existsSync(candidate)) {
          addRunner(candidate)
        }
      }
    }
  }

  return runners
}

async function resolveViaYtDlp(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`

  for (const runner of discoverYtDlpRunners()) {
    try {
      const { stdout } = await execFileAsync(
        runner.command,
        [
          ...runner.prefix,
          '-f',
          'bestaudio/best',
          '-g',
          ...YT_DLP_ARGS,
          watchUrl,
        ],
        { timeout: 90_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      )

      const audioUrl = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.startsWith('http'))

      if (audioUrl) return audioUrl
    } catch {
      // try next runner
    }
  }

  return null
}

async function resolveViaInnertube(videoId: string): Promise<string> {
  const yt = await Innertube.create({ retrieve_player: true })
  const info = await yt.getInfo(videoId)
  const format = info.chooseFormat({ type: 'audio', quality: 'best' })

  if (!format) {
    throw new Error('No audio stream found for this YouTube video.')
  }

  if (format.url) {
    return format.url
  }

  const player = yt.session.player
  if (!player) {
    throw new Error('YouTube player data unavailable.')
  }

  if (format.decipher) {
    const deciphered = await format.decipher(player)
    if (deciphered) return deciphered
  }

  throw new Error('Could not resolve YouTube audio stream.')
}

export async function resolveYouTubeAudioUrl(videoId: string): Promise<string> {
  const ytdlpUrl = await resolveViaYtDlp(videoId)
  if (ytdlpUrl) return ytdlpUrl

  try {
    return await resolveViaInnertube(videoId)
  } catch (innertubeError) {
    const message =
      innertubeError instanceof Error ? innertubeError.message : 'YouTube audio extraction failed.'
    throw new Error(
      `${message} Install yt-dlp for reliable YouTube imports: python -m pip install -U yt-dlp`,
    )
  }
}

export async function resolveYouTubeTranscriptionUrl(youtubeUrl: string): Promise<string> {
  const videoId = parseYouTubeVideoId(youtubeUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL.')
  }
  return resolveYouTubeAudioUrl(videoId)
}

export async function downloadYouTubeAudio(youtubeUrl: string, lectureId: string): Promise<string> {
  // Reuse already-downloaded audio (supports legacy .webm and new .wav paths).
  for (const ext of ['wav', 'webm', 'm4a', 'mp3']) {
    const relativePath = `${lectureId}.${ext}`
    const absolutePath = getAbsolutePath(LECTURES_CATEGORY, relativePath)
    if (existsSync(absolutePath)) {
      return buildFileUrl(LECTURES_CATEGORY, relativePath)
    }
  }

  const videoId = parseYouTubeVideoId(youtubeUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL.')
  }

  const useWavOutput = isFfmpegAvailable()
  const relativePath = useWavOutput ? `${lectureId}.wav` : `${lectureId}.webm`
  const absolutePath = getAbsolutePath(LECTURES_CATEGORY, relativePath)

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  let downloaded = false
  let lastError: any = null

  const downloadArgs = useWavOutput
    ? [
        '-f',
        'bestaudio/best',
        '-x',
        '--audio-format',
        'wav',
        '--postprocessor-args',
        'ffmpeg:-ar 16000 -ac 1',
        '-o',
        absolutePath,
        ...YT_DLP_ARGS,
        watchUrl,
      ]
    : [
        '-f',
        'bestaudio[filesize<24M]/bestaudio/best',
        '-o',
        absolutePath,
        ...YT_DLP_ARGS,
        watchUrl,
      ]

  for (const runner of discoverYtDlpRunners()) {
    try {
      await execFileAsync(
        runner.command,
        [...runner.prefix, ...downloadArgs],
        { timeout: 180_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
      )
      if (existsSync(absolutePath)) {
        downloaded = true
        break
      }
    } catch (err) {
      lastError = err
      // try next runner
    }
  }

  if (!downloaded && useWavOutput) {
    const webmPath = absolutePath.replace(/\.wav$/, '.webm')
    if (existsSync(webmPath)) {
      try {
        const wavBuffer = await convertBufferToMonoWav(readFileSync(webmPath), 'webm')
        writeFileSync(absolutePath, wavBuffer)
        downloaded = true
      } catch (convertErr) {
        lastError = convertErr
      }
    }
  }

  if (!downloaded) {
    // Attempt fallback with Innertube and fetching
    try {
      const directUrl = await resolveViaInnertube(videoId)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120_000)
      const response = await fetch(directUrl, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!response.ok) {
        throw new Error(`Failed to fetch YouTube audio stream (${response.status})`)
      }
      const rawBuffer = Buffer.from(await response.arrayBuffer())
      try {
        const wavBuffer = await convertBufferToMonoWav(rawBuffer, 'webm')
        writeFileSync(absolutePath, wavBuffer)
      } catch {
        writeFileSync(absolutePath, rawBuffer)
      }
      downloaded = true
    } catch (fallbackError) {
      throw new Error(
        `Failed to download YouTube audio. yt-dlp download failed: ${lastError?.message || lastError}. Fallback failed: ${fallbackError}`,
      )
    }
  }

  return buildFileUrl(LECTURES_CATEGORY, relativePath)
}
