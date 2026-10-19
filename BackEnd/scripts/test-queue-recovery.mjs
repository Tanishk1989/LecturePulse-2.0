import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require = createRequire(import.meta.url)
require('dotenv').config({quiet:true})
const {prisma} = require('../dist/config/db.js')
const limits = require('../dist/services/sharedAiLimit.js')
const queue = require('../dist/services/processingQueue.js')

test('limiter acquisition failures release only the claimed job without consuming a processing attempt', async()=>{
  const originals = {query:prisma.$queryRaw,execute:prisma.$executeRaw,acquire:limits.acquireAiPermit}
  const writes=[]
  try {
    prisma.$queryRaw = async()=>[{lectureId:'owned',userId:'alice',options:{generateNotes:true},attempts:1}]
    prisma.$executeRaw = async(strings,...values)=>{writes.push({sql:strings.join('?'),values});return 1}
    limits.acquireAiPermit = async()=>{throw Error('private database diagnostic')}
    await queue.runProcessingQueueOnce()
    const released=writes.find(write=>write.sql.includes("state='queued'"))
    assert.ok(released)
    assert.match(released.sql,/attempts=GREATEST\(0,attempts-1\)/)
    assert.match(released.sql,/lease_until=NULL,lease_token=NULL/)
    assert.match(released.sql,/state='running' AND lease_token=/)
    assert.match(released.sql,/INTERVAL '30 seconds'/)
    assert.equal(released.values[0],'owned')
    assert.equal(typeof released.values[1],'string')
    assert.ok(!JSON.stringify(writes).includes('private database diagnostic'))
    assert.ok(!writes.some(write=>/UPDATE lectures/.test(write.sql)&&!write.sql.includes('WITH exhausted')))
  } finally {
    prisma.$queryRaw=originals.query
    prisma.$executeRaw=originals.execute
    limits.acquireAiPermit=originals.acquire
  }
})
