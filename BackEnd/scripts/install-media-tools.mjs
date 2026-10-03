import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Render's Node runtime includes Python, but not yt-dlp. Keep it inside the
// deploy artifact rather than relying on a global or an ephemeral home install.
if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const target = path.join(root, '.runtime', 'python')
  const python = process.env.PYTHON_PATH || 'python3'
  execFileSync(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-cache-dir', '--upgrade', '--target', target, 'yt-dlp==2026.8.19'], { stdio: 'inherit', timeout: 180000 })
  execFileSync(python, ['-m', 'yt_dlp', '--version'], {
    stdio: 'inherit', timeout: 15000,
    env: { ...process.env, PYTHONPATH: [target, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) },
  })
}
