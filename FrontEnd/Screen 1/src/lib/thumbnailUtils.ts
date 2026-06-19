export function generateVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration > 0 ? video.duration * 0.12 : 0)
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 270
      const context = canvas.getContext('2d')
      if (!context) {
        cleanup()
        resolve(null)
        return
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      cleanup()
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }

    video.src = url
  })
}

export function generateVideoThumbnailFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration > 0 ? video.duration * 0.12 : 0)
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 270
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(null)
        return
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }

    video.onerror = () => resolve(null)
    video.src = url
  })
}
