import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { tokenize, chunkTranscript, rankChunks } = require('../dist/services/lexicalRetrieval.js')
test('Unicode tokens preserve Hindi and ignore punctuation and stop words', () => {
  assert.deepEqual(tokenize('Explain ACID, परमाणुता?'), ['acid', 'परमाणुता'])
})
test('bounded overlapping chunks retain the final words', () => {
  const chunks = chunkTranscript(Array.from({length:400}, (_, i) => `w${i}`).join(' '))
  assert.equal(chunks.length, 3)
  assert.equal(chunks[0].split(' ').length, 180)
  assert.ok(chunks[1].startsWith('w140 '))
  assert.ok(chunks.at(-1).endsWith('w399'))
  assert.deepEqual(chunkTranscript('  '), [])
})
const docs = [
  {text:'Atomicity ensures a bank transfer succeeds together or rolls back.', lectureId:'bank', lectureTitle:'Transactions'},
  {text:'Photosynthesis converts sunlight to energy in plants.', lectureId:'plant', lectureTitle:'Biology'},
]
test('keyword ranking works without embedding credentials and rejects unrelated queries', () => {
  assert.equal(rankChunks('What is atomicity in a bank transfer?', docs)[0].lectureId, 'bank')
  assert.deepEqual(rankChunks('quantum entanglement', docs), [])
  assert.deepEqual(rankChunks('what is the', docs), [])
  assert.equal(rankChunks('bank plants', docs, 1).length, 1)
  assert.equal(rankChunks('bank plants', docs, NaN).length, 2)
})
test('Hindi exact terms retrieve relevant Hindi excerpts', () => {
  assert.equal(rankChunks('परमाणुता क्या है', [{...docs[0], text:'परमाणुता सभी कार्यों को एक साथ सफल बनाती है।'}]).length, 1)
})
test('retrieval checks transcript and parent ownership and recovers unindexed lectures', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  const { prisma } = require('../dist/config/db.js')
  const { retrieveRagChunks, indexLectureRag } = require('../dist/services/ragService.js')
  const originalFind = prisma.transcript.findMany
  const originalLectureFind = prisma.lecture.findFirst
  try {
    prisma.transcript.findMany = async query => {
      assert.equal(query.where.userId, 'owner')
      assert.deepEqual(query.where.lecture, {userId:'owner'})
      assert.equal(query.where.status, 'completed')
      assert.deepEqual(query.where.lectureId.in, ['bank'])
      return [{lectureId:'bank', fullText:docs[0].text, lecture:{title:'Transactions'}}]
    }
    assert.equal((await retrieveRagChunks('owner', 'atomicity', ['bank','bank']))[0].lectureId, 'bank')
    prisma.lecture.findFirst = async query => {
      assert.deepEqual(query.where, {id:'other', userId:'owner'})
      return null
    }
    assert.equal(await indexLectureRag('other', 'owner', 'private'), 0)
  } finally {
    prisma.transcript.findMany = originalFind
    prisma.lecture.findFirst = originalLectureFind
    await prisma.$disconnect()
  }
})
