import { execFile, execSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Innertube } from 'youtubei.js'
import { parseYouTubeVideoId } from './youtubeUtils'
import { LECTURES_CATEGORY, MAX_UPLOAD_BYTES, getAbsolutePath, buildFileUrl, storeFile } from '../config/storage'

const execFileAsync = promisify(execFile)

const YT_DLP_ARGS = ['--js-runtimes', 'node', '--remote-components', 'ejs:github']

type YtDlpRunner = { command: string; prefix: string[]; env?: NodeJS.ProcessEnv }

const bundledPython = path.join(process.cwd(), '.runtime', 'python')
export function isBundledYouTubeDownloaderAvailable(): boolean {
  return existsSync(path.join(bundledPython, 'yt_dlp', '__main__.py'))
}

function discoverYtDlpRunners(): YtDlpRunner[] {
  const runners: YtDlpRunner[] = []
  const seen = new Set<string>()

  const addRunner = (command: string, prefix: string[] = [], env?: NodeJS.ProcessEnv) => {
    const key = `${command}|${prefix.join(' ')}`
    if (seen.has(key)) return
    seen.add(key)
    runners.push({ command, prefix, env })
  }

  if (isBundledYouTubeDownloaderAvailable()) {
    addRunner(process.env.PYTHON_PATH || 'python3', ['-m', 'yt_dlp'], {
      ...process.env, PYTHONPATH: [bundledPython, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    })
  }

  if (process.env.YT_DLP_PATH) {
    addRunner(process.env.YT_DLP_PATH)
  }

  addRunner('yt-dlp')
  addRunner('python', ['-m', 'yt_dlp'])
  addRunner('python3', ['-m', 'yt_dlp'])

  if (process.platform === 'win32') try {
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
        { timeout: 90_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024, env: runner.env },
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

export async function downloadYouTubeAudio(youtubeUrl: string, lectureId: string, userId: string): Promise<string> {
  // Preserve compressed audio in durable storage; expand to PCM only while transcribing.
  const mimeTypes: Record<string, string> = { m4a: 'audio/mp4', webm: 'audio/webm', mp3: 'audio/mpeg', wav: 'audio/wav' }
  for (const ext of ['m4a', 'webm', 'mp3', 'wav']) {
    const relativePath = `${userId}/${lectureId}.${ext}`
    const absolutePath = getAbsolutePath(LECTURES_CATEGORY, relativePath)
    if (existsSync(absolutePath) && statSync(absolutePath).size > 0 && statSync(absolutePath).size <= MAX_UPLOAD_BYTES) {
      await storeFile(LECTURES_CATEGORY, relativePath, absolutePath, mimeTypes[ext])
      return buildFileUrl(LECTURES_CATEGORY, relativePath)
    }
  }

  const videoId = parseYouTubeVideoId(youtubeUrl)
  if (!videoId) {
    throw new Error('Invalid YouTube URL.')
  }

  const outputTemplate = getAbsolutePath(LECTURES_CATEGORY, `${userId}/${lectureId}.%(ext)s`)
  mkdirSync(path.dirname(outputTemplate), { recursive: true })

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  let savedPath: string | null = null
  let lastError: unknown = null
  const downloadArgs = ['--no-playlist', '--no-part', '--socket-timeout', '20', '--retries', '1',
    '--max-filesize', String(MAX_UPLOAD_BYTES), '-f', 'bestaudio[ext=m4a]/bestaudio[ext=webm]',
    '-o', outputTemplate, ...YT_DLP_ARGS, watchUrl]

  for (const runner of discoverYtDlpRunners()) {
    try {
      await execFileAsync(
        runner.command,
        [...runner.prefix, ...downloadArgs],
        { timeout: 180_000, windowsHide: true, maxBuffer: 10 * 1024 * 1024, env: runner.env },
      )
      for (const ext of ['m4a', 'webm']) {
        const relative = `${userId}/${lectureId}.${ext}`
        const absolute = getAbsolutePath(LECTURES_CATEGORY, relative)
        if (existsSync(absolute)) {
          const size = statSync(absolute).size
          if (size > 0 && size <= MAX_UPLOAD_BYTES) savedPath = relative
          else unlinkSync(absolute)
        }
      }
      if (savedPath) break
    } catch (err) {
      lastError = err
      // An interrupted download must never be reused as a complete file.
      for (const ext of ['m4a', 'webm']) {
        try { unlinkSync(getAbsolutePath(LECTURES_CATEGORY, `${userId}/${lectureId}.${ext}`)) } catch {}
      }
    }
  }

  if (!savedPath) {
    // Attempt fallback with Innertube and fetching
    try {
      const directUrl = await resolveViaInnertube(videoId)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120_000)
      const parsedUrl = new URL(directUrl)
      if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.googlevideo.com')) {
        clearTimeout(timeoutId)
        throw new Error('Unexpected YouTube media origin.')
      }
      try {
        const response = await fetch(directUrl, { signal: controller.signal, redirect: 'error' })
        if (!response.ok || !response.body) throw new Error(`YouTube media request failed (${response.status}).`)
        const buffers: Buffer[] = []
        let bytes = 0
        for await (const part of response.body) {
          bytes += part.length
          if (bytes > MAX_UPLOAD_BYTES) { controller.abort(); throw new Error('YouTube audio exceeds the 48 MB storage limit.') }
          buffers.push(Buffer.from(part))
        }
        if (!bytes) throw new Error('YouTube returned an empty audio stream.')
        const ext = response.headers.get('content-type')?.includes('mp4') ? 'm4a' : 'webm'
        savedPath = `${userId}/${lectureId}.${ext}`
        writeFileSync(getAbsolutePath(LECTURES_CATEGORY, savedPath), Buffer.concat(buffers))
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (fallbackError) {
      const details = [lastError, fallbackError].map(error => error instanceof Error ? error.message : String(error)).join(' ')
      console.error('[YouTube] Import failed', { blocked: /403|not a bot|sign in/i.test(details), downloaderMissing: /No module named|ENOENT/i.test(details) })
      throw new Error(/403|not a bot|sign in/i.test(details)
        ? 'YouTube is blocking this server from accessing the video. Upload an audio file you are authorized to use instead.'
        : 'YouTube audio could not be downloaded. Check that the video is public and below the 48 MB audio limit.')
    }
  }

  const ext = savedPath.split('.').pop()!
  await storeFile(LECTURES_CATEGORY, savedPath, getAbsolutePath(LECTURES_CATEGORY, savedPath), mimeTypes[ext])
  return buildFileUrl(LECTURES_CATEGORY, savedPath)
}
