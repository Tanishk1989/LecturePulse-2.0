import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { createAiRequestLimit } = require('../dist/middleware/aiRequestLimit.js')
function attempt(limiter, uid = 'owner') {
  const response = new EventEmitter()
  response.headers = {}
  response.setHeader = (key, value) => {response.headers[key] = value}
  response.status = code => {response.code = code;return response}
  response.json = body => {response.body = body;return response}
  response.allowed = false
  limiter({user:uid ? {uid} : undefined},response,() => {response.allowed = true})
  return response
}
test('per-user rate limit returns 429 with retry time, resets at window boundary', () => {
  let time = 0
  const limit = createAiRequestLimit({requests:2, now:() => time})
  attempt(limit).emit('finish');attempt(limit).emit('finish')
  const rejected = attempt(limit)
  assert.equal(rejected.code,429);assert.equal(rejected.headers['Retry-After'],60)
  assert.equal(attempt(limit,'another').allowed,true)
  time = 60_000
  assert.equal(attempt(limit).allowed,true)
})
test('concurrency slots release once on finish/close and cannot be bypassed by window reset', () => {
  let time = 0
  const limit = createAiRequestLimit({concurrent:1,now:() => time})
  const first = attempt(limit)
  time = 60_000
  assert.equal(attempt(limit).code,429)
  first.emit('close');first.emit('finish')
  const second = attempt(limit)
  assert.equal(second.allowed,true)
  assert.equal(attempt(limit).code,429)
  second.emit('finish')
})
test('global quota prevents spreading requests across multiple users', () => {
  const limit = createAiRequestLimit({globalRequests:2})
  attempt(limit,'one').emit('finish');attempt(limit,'two').emit('finish')
  assert.equal(attempt(limit,'three').code,429)
})
test('limiter requires verified identity and bounds active user storage', () => {
  let time = 0
  const limit = createAiRequestLimit({maxUsers:1,now:() => time})
  assert.equal(attempt(limit,null).code,401)
  const first = attempt(limit,'one')
  assert.equal(attempt(limit,'two').code,503)
  first.emit('finish');time = 60_000
  assert.equal(attempt(limit,'two').allowed,true)
})
test('paid routes enforce limits before provider calls, while unauthenticated requests are rejected', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
  process.env.FIREBASE_CONFIG = JSON.stringify({projectId:'lecturepulse-test'})
  const express = require('express')
  const { firebaseAuth } = require('../dist/config/firebase.js')
  const original = firebaseAuth.verifyIdToken
  const shared=require('../dist/services/sharedAiLimit.js')
  const originalAcquire=shared.acquireAiPermit,originalRelease=shared.releaseAiPermit
  let calls=0
  shared.acquireAiPermit=async()=>++calls<=12?{token:'fixture'}:{retryAfter:60}
  shared.releaseAiPermit=async()=>{}
  firebaseAuth.verifyIdToken = async () => ({uid:'quota-test'})
  const app = express();app.use(express.json());app.use(require('../dist/routes/ai.js').default)
  const server = app.listen(0,'127.0.0.1')
  await new Promise(resolve => server.once('listening',resolve))
  const url = `http://127.0.0.1:${server.address().port}/chat`
  try {
    assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401)
    for (let i = 0; i < 12; i++) {
      assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},body:'{}'})).status,400)
    }
    const blocked = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},body:'{}'})
    assert.equal(blocked.status,429);assert.ok(Number(blocked.headers.get('Retry-After')) > 0)
  } finally {await new Promise(resolve => server.close(resolve));firebaseAuth.verifyIdToken = original;shared.acquireAiPermit=originalAcquire;shared.releaseAiPermit=originalRelease}
})
test('closing an SSE answer aborts the upstream provider request', async () => {
  const express = require('express')
  const { firebaseAuth } = require('../dist/config/firebase.js')
  const groq = require('../dist/services/groq.js')
  const originalAuth = firebaseAuth.verifyIdToken, originalClient = groq.getGroqClient
  const shared=require('../dist/services/sharedAiLimit.js')
  const originalAcquire=shared.acquireAiPermit,originalRelease=shared.releaseAiPermit
  shared.acquireAiPermit=async()=>({token:'fixture'})
  shared.releaseAiPermit=async()=>{}
  firebaseAuth.verifyIdToken = async () => ({uid:'stream-test'})
  let confirmAbort
  const aborted = new Promise(resolve => {confirmAbort = resolve})
  groq.getGroqClient = () => ({chat:{completions:{create:async (_body,{signal}) => (async function* () {
    yield {choices:[{delta:{content:'first'}}]}
    await new Promise((_, reject) => {
      const cancel = () => {confirmAbort();reject(new Error('Cancelled fixture'))}
      if (signal.aborted) cancel();else signal.addEventListener('abort',cancel,{once:true})
    })
  })()}}})
  const app = express();app.use(express.json());app.use(require('../dist/routes/ai.js').default)
  const server = app.listen(0,'127.0.0.1');await new Promise(resolve => server.once('listening',resolve))
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/stream-chat`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer fixture'},
      body:JSON.stringify({systemPrompt:'fixture',userPrompt:'fixture'}),
    })
    const reader = response.body.getReader()
    assert.match(new TextDecoder().decode((await reader.read()).value),/first/)
    await reader.cancel()
    await Promise.race([aborted,new Promise((_, reject) => {const timer = setTimeout(() => reject(new Error('Provider was not cancelled')),2000);timer.unref()})])
  } finally {
    server.closeAllConnections();await new Promise(resolve => server.close(resolve))
    firebaseAuth.verifyIdToken = originalAuth;groq.getGroqClient = originalClient
    shared.acquireAiPermit=originalAcquire;shared.releaseAiPermit=originalRelease
  }
})
