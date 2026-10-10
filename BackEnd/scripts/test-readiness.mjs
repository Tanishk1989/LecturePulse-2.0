import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const express = require('express')
const { createReadiness } = require('../dist/services/readiness.js')

test('startup and database failures respond promptly with 503, without routing into unavailable features', async () => {
  const state = createReadiness()
  const app = express()
  app.use('/api', state.guard)
  app.get('/api/health', (_req, res) => res.status(state.isReady() ? 200 : 503).json({ ready: state.isReady() }))
  app.get('/api/lectures', (_req, res) => res.json({ lectures: [] }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const starting = await fetch(`${base}/api/lectures`)
    assert.equal(starting.status, 503)
    assert.equal((await starting.json()).code, 'SERVICE_STARTING')
    assert.equal(starting.headers.get('retry-after'), '30')
    state.markFailed(new Error('Authentication failed against database server at private-host; provided database credentials are not valid. secret=password'))
    const failed = await fetch(`${base}/api/lectures`)
    assert.equal(failed.status, 503)
    const data = await failed.json()
    assert.equal(data.code, 'DB_AUTH_FAILED')
    assert.doesNotMatch(JSON.stringify(data), /private-host|secret=password/)
    assert.equal((await fetch(`${base}/api/health`)).status, 503)
    state.markReady()
    assert.equal((await fetch(`${base}/api/health`)).status, 200)
    assert.equal((await fetch(`${base}/api/lectures`)).status, 200)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
