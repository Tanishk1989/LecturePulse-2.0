import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.FIREBASE_CONFIG = JSON.stringify({projectId:'lecturepulse-test'})
const express = require('express')
const { prisma } = require('../dist/config/db.js')
const { firebaseAuth } = require('../dist/config/firebase.js')
const { isShareExpired } = require('../dist/utils/shareAccess.js')
const app = express()
app.use(express.json())
for (const [path, route] of [
  ['notes','notes'], ['transcripts','transcripts'], ['flashcards','flashcards'],
  ['ai','ai'], ['knowledge-graph','knowledgeGraph'], ['streaks','streaks'],
  ['shares','shares'], ['analytics','analytics'],
]) app.use(`/${path}`, require(`../dist/routes/${route}.js`).default)

async function withServer(run) {
  const restored = []
  const stub = (object, key, value) => {
    const objectKeyOriginal = object[key]
    restored.push(() => {object[key] = objectKeyOriginal})
    object[key] = value
  }
  stub(firebaseAuth, 'verifyIdToken', async token => {
    if (!['alice', 'admin'].includes(token)) throw new Error('Invalid session')
    return {uid:'alice', institutionAnalyticsAdmin:token === 'admin'}
  })
  stub(prisma.lecture, 'findFirst', async query => {
    assert.equal(query.where.userId, 'alice')
    return query.where.id === 'owned' ? {id:'owned'} : null
  })
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = async (path, body, token = 'alice', method) => {
    const response = await fetch(base + path, {
      method:method ?? (body === undefined ? 'GET':'POST'),
      headers:{'Content-Type':'application/json', ...(token ? {Authorization:`Bearer ${token}`} : {})},
      body:body === undefined ? undefined : JSON.stringify(body),
    })
    return {status:response.status, body:await response.json()}
  }
  try {await run({request, stub})} finally {
    await new Promise(resolve => server.close(resolve))
    for (const restore of restored.reverse()) restore()
  }
}

test('foreign/missing lecture IDs cannot create notes, transcripts, cards, feedback, quiz or study rows', async () => {
  await withServer(async ({request}) => {
    for (const lectureId of ['foreign','missing']) {
      for (const path of ['/notes','/transcripts','/flashcards/batch','/ai/feedback','/knowledge-graph/quiz-attempts','/knowledge-graph/lecture-quiz-attempts','/streaks/session']) {
        const result = await request(path, {lectureId, cards:[], contentType:'summary',feedback:'positive',duration:300})
        assert.equal(result.status, 404, path)
      }
      assert.equal((await request(`/transcripts/lecture/${lectureId}`, {text:'overwrite'},'alice','PATCH')).status, 404)
    }
    assert.equal((await request('/notes', {lectureId:{id:'owned'}})).status, 400)
    assert.equal((await request('/notes', {lectureId:'owned'}, null)).status, 401)
  })
})
test('legitimate owners can save notes and transcript without trusting body userId', async () => {
  await withServer(async ({request, stub}) => {
    for (const [path, model] of [['/notes',prisma.lectureNote], ['/transcripts',prisma.transcript]]) {
      stub(model,'findFirst',async query => {assert.deepEqual(query.where,{lectureId:'owned',userId:'alice'});return null})
      stub(model,'create',async ({data}) => {assert.equal(data.userId,'alice'); return {id:'saved',...data}})
      const result = await request(path, {lectureId:'owned',userId:'bob',text:'owned transcript',summary:'owned notes'})
      assert.equal(result.status,201)
      assert.equal(result.body.userId,'alice')
    }
  })
})
test('feedback read is owner scoped and bounded; owned feedback write still succeeds', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.aiFeedback,'findMany',async query => {
      assert.deepEqual(query.where,{userId:'alice'}); assert.equal(query.take,200)
      return [{id:'own-feedback',userId:'alice'}]
    })
    assert.equal((await request('/ai/feedback')).body[0].userId,'alice')
    stub(prisma.aiFeedback,'create',async ({data}) => {assert.equal(data.userId,'alice');return data})
    assert.equal((await request('/ai/feedback',{lectureId:'owned',contentType:'summary',feedback:'positive'})).status,200)
  })
})
test('legacy child rows must match both child and parent owner on reads', async () => {
  await withServer(async ({request,stub}) => {
    for (const [path, model] of [['/notes',prisma.lectureNote],['/transcripts',prisma.transcript],['/flashcards/lecture/owned',prisma.flashcard]]) {
      stub(model,'findMany',async query => {assert.equal(query.where.userId,'alice');assert.deepEqual(query.where.lecture,{userId:'alice'});return []})
      assert.equal((await request(path)).status,200)
    }
  })
})
test('flashcards reject concept IDs belonging to other lectures/users before writes', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.kgConcept,'count',async query => {
      assert.deepEqual(query.where,{id:{in:['foreign-concept']},userId:'alice',lectureId:'owned'})
      return 0
    })
    assert.equal((await request('/flashcards/batch',{lectureId:'owned',cards:[{front:'Q',back:'A',conceptId:'foreign-concept'}]})).status,404)
  })
})
test('institution analytics rejects ordinary users and client-supplied admin flags without querying data', async () => {
  await withServer(async ({request}) => {
    assert.equal((await request('/analytics/institution')).status,403)
    assert.equal((await request('/analytics/institution?institutionAnalyticsAdmin=true')).status,403)
    assert.equal((await request('/analytics/institution',undefined,null)).status,401)
  })
})
test('institution analytics accepts only the verified server-issued administrator claim', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.lecture,'groupBy',async () => [])
    stub(prisma.lecture,'count',async () => 0)
    stub(prisma.conceptQuizAttempt,'count',async () => 0)
    stub(prisma.conceptQuizAttempt,'findMany',async () => [])
    stub(prisma.kgConcept,'findMany',async () => [])
    stub(prisma.aiFeedback,'findMany',async () => [])
    assert.equal((await request('/analytics/institution',undefined,'admin')).status,200)
  })
})
const share = {userId:'bob',allowMerge:true,expiresAt:new Date(0),lecture:{userId:'bob',title:'Shared',lectureNotes:[{userId:'bob',summary:'Shared notes'}]}}
test('expired share tokens cannot be read or merged', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.lectureShare,'findUnique',async () => share)
    assert.equal((await request('/shares/expired',undefined,null)).status,410)
    assert.equal((await request('/shares/expired/merge',{targetLectureId:'owned'})).status,410)
  })
  assert.equal(isShareExpired(new Date(100),100),true)
  assert.equal(isShareExpired(new Date(101),100),false)
  assert.equal(isShareExpired(null),false)
})
test('shared notes must belong to the sharing owner, not injected child rows', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.lectureShare,'findUnique',async () => ({...share,expiresAt:null,lecture:{...share.lecture,lectureNotes:[{userId:'attacker',summary:'Injected'}]}}))
    assert.equal((await request('/shares/token',undefined,null)).status,404)
    assert.equal((await request('/shares/token/merge',{targetLectureId:'owned'})).status,404)
  })
})
test('valid owner-shared notes still load publicly and merge into an owned target', async () => {
  await withServer(async ({request,stub}) => {
    stub(prisma.lectureShare,'findUnique',async () => ({...share,expiresAt:null}))
    stub(prisma.lectureNote,'findFirst',async query => {
      assert.deepEqual(query.where,{lectureId:'owned',userId:'alice'});return null
    })
    stub(prisma.lectureNote,'create',async ({data}) => {
      assert.equal(data.lectureId,'owned');assert.equal(data.userId,'alice');return data
    })
    assert.equal((await request('/shares/token',undefined,null)).body.content.summary,'Shared notes')
    assert.equal((await request('/shares/token/merge',{targetLectureId:'owned'})).status,200)
    assert.equal((await request('/shares/token/merge',{targetLectureId:'foreign'})).status,404)
  })
})
