import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parseYouTubeVideoId } = require('../dist/services/youtubeUtils.js')

test('accepts canonical, short, mobile, shorts and embed video links', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=jNQXAC9IVRw&list=test',
    'https://youtu.be/jNQXAC9IVRw?t=1',
    'https://m.youtube.com/watch?v=jNQXAC9IVRw',
    'https://youtube.com/shorts/jNQXAC9IVRw',
    'https://youtube.com/embed/jNQXAC9IVRw',
  ]) assert.equal(parseYouTubeVideoId(url), 'jNQXAC9IVRw')
})

test('rejects deceptive origins, credentials and malformed video ids', () => {
  for (const url of [
    'https://youtube.com.evil.test/watch?v=jNQXAC9IVRw',
    'https://youtube.com@evil.test/watch?v=jNQXAC9IVRw',
    'https://user:password@youtube.com/watch?v=jNQXAC9IVRw',
    'ftp://youtube.com/watch?v=jNQXAC9IVRw',
    'https://youtube.com:5000/watch?v=jNQXAC9IVRw',
    'https://youtube.com/watch?v=../invalid',
    'https://youtube.com/watch?v=jNQXAC9IVRw%26list%3Dother',
    'https://youtu.be/too-short',
    'not a url',
  ]) assert.equal(parseYouTubeVideoId(url), null)
})

test('emoji cleanup preserves complete Unicode code points', () => {
  const stripPrefix = text => text.replace(/^[🎙📄]\uFE0F?\s*/u, '')
  assert.equal(stripPrefix('🎙 Lecture'), 'Lecture')
  assert.equal(stripPrefix('🎙️ Lecture'), 'Lecture')
  assert.equal(stripPrefix('📄 Notes'), 'Notes')
})
