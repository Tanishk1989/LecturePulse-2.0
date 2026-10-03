import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const require = createRequire(import.meta.url)
const { parseWavHeader, splitWavBuffer } = require('../dist/services/wavAudio.js')
const { discoverFfmpegCommand, convertBufferToMonoWav } = require('../dist/services/audioConvertService.js')

function chunk(id, payload) {
  const result = Buffer.alloc(8 + payload.length + payload.length % 2)
  result.write(id)
  result.writeUInt32LE(payload.length, 4)
  payload.copy(result, 8)
  return result
}
function wav({ metadata = [], tail = [], channels = 1, rate = 16000, bits = 16, samples = 16001 } = {}) {
  const fmt = Buffer.alloc(16)
  fmt.writeUInt16LE(1)
  fmt.writeUInt16LE(channels, 2)
  fmt.writeUInt32LE(rate, 4)
  fmt.writeUInt32LE(rate * channels * bits / 8, 8)
  fmt.writeUInt16LE(channels * bits / 8, 12)
  fmt.writeUInt16LE(bits, 14)
  const audio = Buffer.alloc(samples * channels * bits / 8, 7)
  const body = Buffer.concat([...metadata, chunk('fmt ', fmt), chunk('data', audio), ...tail])
  const header = Buffer.alloc(12)
  header.write('RIFF')
  header.writeUInt32LE(body.length + 4, 4)
  header.write('WAVE', 8)
  return Buffer.concat([header, body])
}

test('walks padded metadata and ignores fake chunk identifiers', () => {
  const input = wav({ metadata: [chunk('JUNK', Buffer.from('datafmt ' + 'x'.repeat(2001)))] })
  const info = parseWavHeader(input)
  assert.ok(info)
  assert.equal(info.dataSize, 32002)
  assert.equal(info.duration, 16001 / 16000)
})

test('rejects truncated, inconsistent and empty PCM without throwing', () => {
  const input = wav()
  assert.equal(parseWavHeader(input.subarray(0, 30)), null)
  assert.equal(parseWavHeader(input.subarray(0, input.length - 1)), null)
  for (const offset of [24, 28, 32]) {
    const malformed = Buffer.from(input)
    malformed.fill(0, offset, offset + (offset === 32 ? 2 : 4))
    assert.equal(parseWavHeader(malformed), null)
  }
  assert.equal(parseWavHeader(wav({ samples: 0 })), null)
})

test('chunk sizes are bounded, aligned and timestamps reflect actual samples', () => {
  const input = wav({ channels: 2, rate: 48000, samples: 48001 })
  const info = parseWavHeader(input)
  assert.ok(info)
  const parts = splitWavBuffer(input, info, 50001)
  assert.ok(parts.length > 1)
  let consumed = 0
  for (const part of parts) {
    assert.ok(part.buffer.length <= 50001)
    const parsed = parseWavHeader(part.buffer)
    assert.ok(parsed)
    assert.equal(part.startSeconds, consumed / info.byteRate)
    assert.equal(parsed.dataSize % info.blockAlign, 0)
    consumed += parsed.dataSize
  }
  assert.equal(consumed, info.dataSize)
})

test('does not transcribe trailing metadata and preserves exact audio bytes', () => {
  const input = wav({ tail: [chunk('LIST', Buffer.from('not audio'))] })
  const info = parseWavHeader(input)
  const parts = splitWavBuffer(input, info, 10000)
  const restored = Buffer.concat(parts.map(part => {
    const parsed = parseWavHeader(part.buffer)
    return part.buffer.subarray(44, 44 + parsed.dataSize)
  }))
  assert.deepEqual(restored, input.subarray(info.dataOffset + 8, info.dataOffset + 8 + info.dataSize))
})

test('handles odd PCM data padding and rejects impossible chunk budgets', () => {
  const input = wav({ bits: 8, samples: 5 })
  const info = parseWavHeader(input)
  assert.ok(info)
  for (const part of splitWavBuffer(input, info, 48)) {
    assert.ok(parseWavHeader(part.buffer))
    assert.ok(part.buffer.length <= 48)
  }
  assert.throws(() => splitWavBuffer(input, info, 44))
  assert.throws(() => splitWavBuffer(input, info, 100, 0))
})

test('bundled ffmpeg converts compressed stereo audio to transcription-ready PCM', async () => {
  const command = discoverFfmpegCommand()
  assert.ok(command, 'ffmpeg must be installed with backend dependencies')
  const folder = mkdtempSync(path.join(tmpdir(), 'lp-audio-test-'))
  const source = path.join(folder, 'source.wav')
  const compressed = path.join(folder, 'audio.mp3')
  try {
    writeFileSync(source, wav({ channels: 2, rate: 48000, samples: 48000 }))
    execFileSync(command, ['-y', '-i', source, compressed], { windowsHide: true, stdio: 'ignore', timeout: 30000 })
    const converted = await convertBufferToMonoWav(readFileSync(compressed), 'mp3')
    const info = parseWavHeader(converted)
    assert.ok(info)
    assert.equal(info.numChannels, 1)
    assert.equal(info.sampleRate, 16000)
    assert.equal(info.bitsPerSample, 16)
    assert.ok(info.duration >= 0.9 && info.duration <= 1.2)
  } finally {
    for (const file of [source, compressed]) { try { unlinkSync(file) } catch {} }
    rmdirSync(folder)
  }
})
