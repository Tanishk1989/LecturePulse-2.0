import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { fetchYouTubeTranscript, parseYouTubeTranscript } = require('../dist/services/youtubeTranscriptService.js')
const fixture = { lang: 'en', content: [
  { text: 'Atomicity is all or nothing.', offset: 1500, duration: 2300 },
  { text: 'Durability survives crashes.', offset: 4200, duration: 3000 },
] }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

test('provider chunks retain true millisecond timestamps and tolerate plain text without inventing times', () => {
  const result = parseYouTubeTranscript(fixture)
  assert.deepEqual(result.segments[0], { id: 0, start: 1.5, end: 3.8, text: fixture.content[0].text })
  assert.equal(result.duration, 7.2)
  assert.equal(result.text, 'Atomicity is all or nothing. Durability survives crashes.')
  assert.deepEqual(parseYouTubeTranscript({ content: ' hello ', lang: 'hi' }), { text: 'hello', language: 'hi', segments: [] })
  for (const value of [{ content: [] }, { content: [{ text: 'x', offset: -1, duration: 5 }] },
    { content: [{ text: 'x', offset: 1, duration: '5' }] }, { content: [{ text: ' ', offset: 0, duration: 5 }] }]) {
    assert.throws(() => parseYouTubeTranscript(value))
  }
})

test('validated canonical links use fixed origin, backend header, timestamps and automatic fallback mode', async () => {
  const previousKey = process.env.SUPADATA_API_KEY
  process.env.SUPADATA_API_KEY = 'test-only-secret'
  try {
    let calls = 0
    const fetchImpl = async (url, options) => {
      calls++
      assert.equal(url.origin, 'https://api.supadata.ai')
      assert.equal(url.searchParams.get('url'), 'https://www.youtube.com/watch?v=jNQXAC9IVRw')
      assert.equal(url.searchParams.get('text'), 'false')
      assert.equal(url.searchParams.get('mode'), 'auto')
      assert.equal(url.searchParams.get('lang'), 'hi')
      assert.equal(options.headers['x-api-key'], 'test-only-secret')
      assert.equal(options.redirect, 'error')
      assert.ok(!url.href.includes('test-only-secret'))
      return json(fixture)
    }
    assert.equal((await fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw?list=anything', 'hi', { fetchImpl })).text, parseYouTubeTranscript(fixture).text)
    await assert.rejects(fetchYouTubeTranscript('https://evil.test/watch?v=jNQXAC9IVRw', undefined, { fetchImpl }), /Invalid YouTube/)
    assert.equal(calls, 1)
    await fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', 'auto', { fetchImpl: async url => {
      assert.equal(url.searchParams.get('lang'), 'en')
      return json(fixture)
    } })
  } finally { if (previousKey === undefined) delete process.env.SUPADATA_API_KEY; else process.env.SUPADATA_API_KEY = previousKey }
})

test('async jobs poll only the same provider, support both result formats, and reject unsafe IDs/statuses', async () => {
  const previousKey = process.env.SUPADATA_API_KEY
  process.env.SUPADATA_API_KEY = 'test-only-secret'
  try {
    for (const result of [{ status: 'completed', ...fixture }, { status: 'completed', result: fixture }]) {
      const replies = [json({ jobId: 'job-123' }, 202), json({ status: 'queued' }), json(result)]
      let calls = 0
      const fetchImpl = async url => {
        if (calls) assert.equal(url.href, 'https://api.supadata.ai/v1/transcript/job-123')
        return replies[calls++]
      }
      assert.equal((await fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined, { fetchImpl, wait: async () => {} })).segments.length, 2)
      assert.equal(calls, 3)
    }
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined,
      { fetchImpl: async () => json({ jobId: '../secret' }, 202) }), /Invalid YouTube/)
    let calls = 0
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined, {
      fetchImpl: async () => calls++ ? json({ status: 'failed', error: 'private provider data' }) : json({ jobId: 'job-123' }, 202), wait: async () => {},
    }), /YouTube transcript processing failed/)
  } finally { if (previousKey === undefined) delete process.env.SUPADATA_API_KEY; else process.env.SUPADATA_API_KEY = previousKey }
})

test('quota, credentials, missing captions, malformed/oversized responses and timeouts fail safely', async () => {
  const previousKey = process.env.SUPADATA_API_KEY
  process.env.SUPADATA_API_KEY = 'test-only-secret'
  try {
    for (const status of [401, 402, 403, 404, 429, 206, 500]) {
      await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined,
        { fetchImpl: async () => json({ message: 'test-only-secret private' }, status) }), error => !/test-only-secret|private/.test(error.message))
    }
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined,
      { fetchImpl: async () => new Response('not json') }), /temporarily unavailable/)
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined,
      { fetchImpl: async () => new Response('x'.repeat(4 * 1024 * 1024 + 1)) }), /size limit/)
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw', undefined, {
      timeoutMs: 5,
      fetchImpl: async (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('network private data')), { once: true })),
    }), /timed out/)
    delete process.env.SUPADATA_API_KEY
    await assert.rejects(fetchYouTubeTranscript('https://youtu.be/jNQXAC9IVRw'), /not configured/)
  } finally { if (previousKey === undefined) delete process.env.SUPADATA_API_KEY; else process.env.SUPADATA_API_KEY = previousKey }
})

test('lecture pipeline saves provider transcript durably and does not download blocked YouTube audio', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  const previousKey = process.env.SUPADATA_API_KEY
  const previousFetch = globalThis.fetch
  process.env.SUPADATA_API_KEY = 'test-only-secret'
  const { prisma } = require('../dist/config/db.js')
  const youtube = require('../dist/services/youtubeService.js')
  const audio = require('../dist/services/transcribeService.js')
  const speakers = require('../dist/services/speakerDetectionService.js')
  const rag = require('../dist/services/ragService.js')
  const originals = []
  const mock = (object, property, value) => { originals.push([object, property, object[property]]); object[property] = value }
  const updates = []
  let providerCalls = 0
  try {
    globalThis.fetch = async () => { providerCalls++; return json(fixture) }
    mock(prisma.lecture, 'findFirst', async query => {
      if (query.select) return { kgStatus: 'completed' }
      assert.deepEqual(query.where, { id: 'owned-lecture', userId: 'owner' })
      return { id: 'owned-lecture', userId: 'owner', fileUrl: 'https://youtu.be/jNQXAC9IVRw', source: 'youtube', fileType: 'video', title: 'Topic — Subtopic' }
    })
    mock(prisma.lecture, 'update', async () => ({}))
    mock(prisma.lecture, 'findUnique', async () => ({ title: 'Topic — Subtopic' }))
    mock(prisma.transcript, 'findFirst', async () => null)
    mock(prisma.transcript, 'create', async () => ({ id: 'transcript' }))
    mock(prisma.transcript, 'update', async query => { updates.push(query.data); return { id: 'transcript' } })
    mock(prisma.kgConcept, 'count', async () => 1)
    mock(youtube, 'downloadYouTubeAudio', async () => { throw new Error('Must not download audio') })
    mock(audio, 'transcribeFromUrl', async () => { throw new Error('Must not call Whisper') })
    mock(speakers, 'detectSpeakersInSegments', async segments => segments)
    mock(rag, 'indexLectureRag', async () => 1)
    const groq = require('../dist/services/groq.js')
    mock(groq, 'groqChatCompletion', async (_, text) => text)
    const { triggerLectureProcessing } = require('../dist/services/processingService.js')
    await triggerLectureProcessing('owned-lecture', 'owner', { generateNotes: false })
    const saved = updates.find(update => update.status === 'completed')
    assert.equal(saved.rawText, parseYouTubeTranscript(fixture).text)
    assert.equal(saved.segments[0].start, 1.5)
    assert.equal(providerCalls, 1)
  } finally {
    for (const [object, property, original] of originals.reverse()) object[property] = original
    globalThis.fetch = previousFetch
    if (previousKey === undefined) delete process.env.SUPADATA_API_KEY; else process.env.SUPADATA_API_KEY = previousKey
    await prisma.$disconnect()
  }
})
