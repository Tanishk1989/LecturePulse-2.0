import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readdirSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const express = require('express')
const { createIncomingUpload } = require('../dist/middleware/multipartUpload.js')

test('patched UUID dependency remains compatible with gaxios multipart requests', async () => {
  const { Gaxios } = require('gaxios')
  const client = new Gaxios()
  const response = await client.request({
    url: 'https://example.invalid/upload', method: 'POST',
    multipart: [{ headers: {'Content-Type':'text/plain'}, content: 'safe fixture' }],
    adapter: async options => {
      assert.match(options.headers['Content-Type'], /^multipart\/related; boundary=[a-f0-9-]+$/)
      const chunks = []
      for await (const chunk of options.body) chunks.push(Buffer.from(chunk))
      assert.match(Buffer.concat(chunks).toString(), /safe fixture/)
      return {status:200, statusText:'OK', headers:{}, config:options, data:'compatible'}
    },
  })
  assert.equal(response.data, 'compatible')
})

test('multipart disk uploads preserve fields and reject oversized, extra and malformed input', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'lp-upload-test-'))
  const app = express()
  const upload = createIncomingUpload(directory, 16).single('file')
  app.post('/', (req, res) => upload(req, res, error => {
    if (error) return res.status(400).json({code:error.code ?? 'INVALID'})
    const content = req.file ? readFileSync(req.file.path, 'utf8') : null
    if (req.file) unlinkSync(req.file.path)
    res.json({body:req.body, content})
  }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}/`
  const form = (text = 'safe audio') => {
    const data = new FormData()
    data.append('file', new Blob([text]), 'test.wav')
    data.append('category', 'lectures')
    data.append('relativePath', 'owner/test.wav')
    return data
  }
  try {
    const valid = await fetch(url, {method:'POST', body:form()})
    assert.equal(valid.status, 200)
    assert.deepEqual(await valid.json(), {body:{category:'lectures', relativePath:'owner/test.wav'},content:'safe audio'})
    const large = await fetch(url, {method:'POST', body:form('x'.repeat(17))})
    assert.equal((await large.json()).code, 'LIMIT_FILE_SIZE')
    const extra = form()
    extra.append('file', new Blob(['second']), 'second.wav')
    assert.equal((await (await fetch(url, {method:'POST',body:extra})).json()).code, 'LIMIT_FILE_COUNT')
    const fields = form()
    fields.append('extra', 'unbounded')
    assert.equal((await fetch(url, {method:'POST',body:fields})).status, 400)
    const malformed = await fetch(url, {method:'POST', headers:{'Content-Type':'multipart/form-data; boundary=test'}, body:'--test\r\nmalformed'})
    assert.equal(malformed.status, 400)
    assert.deepEqual(readdirSync(directory), [])
  } finally {
    await new Promise(resolve => server.close(resolve))
    for (const file of readdirSync(directory)) unlinkSync(join(directory,file))
    rmdirSync(directory)
  }
})

test('modular Firebase auth rejects absent/invalid sessions and passes verified identity only', async () => {
  process.env.FIREBASE_CONFIG = JSON.stringify({projectId:'lecturepulse-test'})
  const { firebaseAuth } = require('../dist/config/firebase.js')
  const { requireAuth } = require('../dist/middleware/auth.js')
  const original = firebaseAuth.verifyIdToken
  const response = {status(code) {this.code = code; return this}, json(body) {this.body = body; return this}}
  let nextCalls = 0
  try {
    await requireAuth({headers:{}}, response, () => nextCalls++)
    assert.equal(response.code, 401)
    firebaseAuth.verifyIdToken = async () => {throw new Error('invalid')}
    await requireAuth({headers:{authorization:'Bearer invalid'}}, response, () => nextCalls++)
    assert.equal(response.code, 401)
    assert.equal(nextCalls, 0)
    firebaseAuth.verifyIdToken = async token => {
      assert.equal(token, 'verified')
      return {uid:'owner'}
    }
    const request = {headers:{authorization:'Bearer verified'}}
    await requireAuth(request, response, () => nextCalls++)
    assert.equal(request.user.uid, 'owner')
    assert.equal(nextCalls, 1)
  } finally {firebaseAuth.verifyIdToken = original}
})
