export interface VoiceProfile {
  pitch: number
  energy: number
}

function estimatePitch(samples: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 400)
  const maxLag = Math.floor(sampleRate / 70)
  const size = Math.min(samples.length, sampleRate * 0.4)
  if (size < maxLag * 2) return 0

  let bestLag = 0
  let bestCorr = 0

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let corr = 0
    for (let i = 0; i < size - lag; i += 4) {
      corr += samples[i] * samples[i + lag]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : 0
}

export async function analyzeVoiceProfile(blob: Blob): Promise<VoiceProfile | null> {
  if (blob.size < 1200) return null

  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioContext = new AudioContext()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const channelData = audioBuffer.getChannelData(0)

    let sumSquares = 0
    for (let i = 0; i < channelData.length; i += 8) {
      sumSquares += channelData[i] * channelData[i]
    }
    const energy = Math.sqrt(sumSquares / Math.max(1, channelData.length / 8))
    const pitch = estimatePitch(channelData, audioBuffer.sampleRate)

    await audioContext.close()
    return { pitch, energy }
  } catch {
    return null
  }
}

export class VoiceClusterTracker {
  private centroids: Array<{ pitch: number; energy: number } | null> = [null, null]

  assign(profile: VoiceProfile): 0 | 1 {
    if (!this.centroids[0]) {
      this.centroids[0] = { ...profile }
      return 0
    }

    if (!this.centroids[1]) {
      const distanceToZero = this.distance(profile, this.centroids[0])
      if (distanceToZero > 0.08) {
        this.centroids[1] = { ...profile }
        return 1
      }
      this.updateCentroid(0, profile)
      return 0
    }

    const d0 = this.distance(profile, this.centroids[0])
    const d1 = this.distance(profile, this.centroids[1])
    const cluster: 0 | 1 = d0 <= d1 ? 0 : 1
    this.updateCentroid(cluster, profile)
    return cluster
  }

  reset() {
    this.centroids = [null, null]
  }

  private distance(a: VoiceProfile, b: VoiceProfile): number {
    const pitchDelta = Math.abs(a.pitch - b.pitch) / Math.max(a.pitch, b.pitch, 1)
    const energyDelta = Math.abs(a.energy - b.energy) / Math.max(a.energy, b.energy, 0.0001)
    return pitchDelta * 0.65 + energyDelta * 0.35
  }

  private updateCentroid(index: 0 | 1, profile: VoiceProfile) {
    const current = this.centroids[index]
    if (!current) {
      this.centroids[index] = { ...profile }
      return
    }
    this.centroids[index] = {
      pitch: current.pitch * 0.8 + profile.pitch * 0.2,
      energy: current.energy * 0.8 + profile.energy * 0.2,
    }
  }
}
