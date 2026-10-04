import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
const require = createRequire(import.meta.url)
require('dotenv').config()
const { prisma } = require('../dist/config/db.js')
const processor = require('../dist/services/processingService.js')
const queue = require('../dist/services/processingQueue.js')
const { isValidSyncDocument } = require('../dist/routes/userSync.js')

test('cloud document validation rejects malformed, oversized and duplicate data', () => {
  assert.equal(isValidSyncDocument('preferences', {general: {language: 'en'}}), true)
  assert.equal(isValidSyncDocument('preferences', []), false)
  assert.equal(isValidSyncDocument('unknown', {}), false)
  assert.equal(isValidSyncDocument('tutor-recent', ['owned']), true)
  assert.equal(isValidSyncDocument('tutor-recent', Array(6).fill('owned')), false)
  const message = {id:'a',role:'user',content:'Hello'}
  assert.equal(isValidSyncDocument('tutor-history:all', [message]), true)
  assert.equal(isValidSyncDocument('tutor-history:all', [message,message]), false)
  assert.equal(isValidSyncDocument('tutor-history:all', [{...message,role:'system'}]), false)
  assert.equal(isValidSyncDocument('tutor-history:all', [{...message,content:'x'.repeat(30_001)}]), false)
  const entry = {id:'a',title:'Math',subject:'Math',dayOfWeek:1,startTime:'09:00',endTime:'10:00',autoRecordReminder:false}
  assert.equal(isValidSyncDocument('timetable', [entry]), true)
  assert.equal(isValidSyncDocument('timetable', [entry,entry]), false)
  assert.equal(isValidSyncDocument('timetable', [{...entry,startTime:'24:00'}]), false)
})

test('sync HTTP routes use verified ownership, enforce CAS and block foreign lecture histories', async () => {
  const express=require('express')
  const {firebaseAuth}=require('../dist/config/firebase.js')
  const originalAuth=firebaseAuth.verifyIdToken, originalQuery=prisma.$queryRaw, originalFind=prisma.lecture.findFirst
  let stored=null
  firebaseAuth.verifyIdToken=async token => {if(token!=='alice')throw Error('invalid');return {uid:'alice'}}
  prisma.lecture.findFirst=async query => {assert.equal(query.where.userId,'alice');return query.where.id==='owned'?{id:'owned'}:null}
  prisma.$queryRaw=async (sql,...values) => {
    assert.ok(values.includes('alice'))
    assert.ok(!values.includes('bob'))
    if(sql.join('').includes('INSERT')) {
      const [uid,key,json,revision]=values
      if(stored || revision!==0)return []
      stored={key,data:JSON.parse(json),revision:1};return [stored]
    }
    if(sql.join('').includes('UPDATE')) {
      const [json,uid,key,revision]=values
      if(!stored || stored.revision!==revision)return []
      stored={key,data:JSON.parse(json),revision:revision+1};return [stored]
    }
    return stored?[stored]:[]
  }
  const app=express();app.use(express.json());app.use('/user-sync',require('../dist/routes/userSync.js').default)
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
  const request=async (key,body,token='alice')=>{
    const result=await fetch(`http://127.0.0.1:${server.address().port}/user-sync${key?'/'+encodeURIComponent(key):''}`,{method:body?'PUT':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined})
    return {status:result.status,data:await result.json()}
  }
  try {
    assert.equal((await request('',null,null)).status,401)
    assert.equal((await request('preferences',{data:{general:{}},revision:0,userId:'bob'})).status,200)
    assert.equal((await request('preferences',{data:{general:{language:'hi'}},revision:0})).status,409)
    assert.equal((await request('preferences',{data:{general:{language:'hi'}},revision:1})).data.revision,2)
    assert.equal((await request('')).data.documents.length,1)
    assert.equal((await request('tutor-history:foreign',{data:[],revision:0})).status,404)
    assert.equal((await request('preferences',{data:[],revision:2})).status,400)
  } finally {
    await new Promise(resolve=>server.close(resolve));firebaseAuth.verifyIdToken=originalAuth;prisma.$queryRaw=originalQuery;prisma.lecture.findFirst=originalFind
  }
})

test('real PostgreSQL queue: atomic deduplication, recovery, bounded retries and lease fencing', {skip:process.env.RUN_PERSISTENCE_DB_TEST !== 'true'}, async () => {
  const rollback = new Error('rollback temporary test tables')
  const originals = new Map()
  const stub = (object,key,value) => { const old=object[key]; originals.set(() => {object[key]=old}, true); object[key]=value }
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL search_path TO pg_temp, public')
      await tx.$executeRawUnsafe('CREATE TEMP TABLE lectures (id TEXT PRIMARY KEY,user_id TEXT,status TEXT) ON COMMIT DROP')
      await tx.$executeRawUnsafe('CREATE TEMP TABLE transcripts (lecture_id TEXT,user_id TEXT,status TEXT) ON COMMIT DROP')
      await tx.$executeRawUnsafe('CREATE TEMP TABLE lecture_notes (lecture_id TEXT,user_id TEXT,status TEXT) ON COMMIT DROP')
      const sql = (await Promise.all(['durable_jobs_and_sync.sql','push_and_ai_limits.sql'].map(file=>readFile(new URL('../prisma/migrations/'+file,import.meta.url),'utf8')))).join('\n')
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
        await tx.$executeRawUnsafe(statement.replace(/CREATE TABLE IF NOT EXISTS/g,'CREATE TEMP TABLE'))
      }
      const facade = {$queryRaw:tx.$queryRaw.bind(tx),$executeRaw:tx.$executeRaw.bind(tx), lecture:{update:async ({where,data}) => tx.$executeRaw`UPDATE lectures SET status=${data.status} WHERE id=${where.id}`}}
      stub(prisma,'$transaction',async fn => fn(facade))
      stub(prisma,'$queryRaw',facade.$queryRaw)
      stub(prisma,'$executeRaw',facade.$executeRaw)
      await tx.$executeRaw`INSERT INTO lectures VALUES ('job','alice','uploaded'),('legacy','alice','processing')`
      await queue.enqueueProcessingJob('job','alice',{forceRetranscribe:true})
      await queue.enqueueProcessingJob('job','alice',{forceRetranscribe:false})
      assert.deepEqual(await queue.getProcessingJob('job','alice'),{state:'queued',attempts:0})
      assert.equal(await queue.getProcessingJob('job','bob'),null)
      await assert.rejects(queue.enqueueProcessingJob('job','bob',{}))
      await queue.recoverProcessingJobs()
      assert.equal((await queue.getProcessingJob('legacy','alice')).state,'queued')
      await tx.$executeRaw`UPDATE processing_jobs SET state='completed' WHERE lecture_id='legacy'`
      let calls=0
      stub(processor,'triggerLectureProcessing',async (id,uid,options) => {
        calls++
        assert.equal(id,'job');assert.equal(uid,'alice')
        assert.equal(options.forceRetranscribe,calls === 1)
        await options.assertActive()
        throw new Error('private provider credential detail')
      })
      for (let attempt=1;attempt<=3;attempt++) {
        await queue.runProcessingQueueOnce()
        assert.deepEqual(await queue.getProcessingJob('job','alice'),{state:attempt<3?'queued':'failed',attempts:attempt})
        await tx.$executeRaw`UPDATE processing_jobs SET available_at=NOW()-INTERVAL '1 second' WHERE lecture_id='job'`
      }
      await queue.runProcessingQueueOnce();assert.equal(calls,3)
      const errors=await tx.$queryRaw`SELECT last_error FROM processing_jobs WHERE lecture_id='job'`
      assert.doesNotMatch(errors[0].last_error,/private|credential/)
      await queue.enqueueProcessingJob('job','alice',{})
      await tx.$executeRaw`UPDATE processing_jobs SET state='running',attempts=1,lease_until=NOW()-INTERVAL '1 second',lease_token='old-process' WHERE lecture_id='job'`
      stub(processor,'triggerLectureProcessing',async (_,__,options) => {await options.assertActive()})
      await queue.runProcessingQueueOnce()
      assert.deepEqual(await queue.getProcessingJob('job','alice'),{state:'completed',attempts:2})
      await queue.enqueueProcessingJob('job','alice',{})
      stub(processor,'triggerLectureProcessing',async (_,__,options) => {
        await tx.$executeRaw`UPDATE processing_jobs SET lease_token='another-worker' WHERE lecture_id='job'`
        await assert.rejects(options.assertActive(),/lease expired/)
      })
      await queue.runProcessingQueueOnce()
      assert.equal((await queue.getProcessingJob('job','alice')).state,'running')
      throw rollback
    },{timeout:240_000})
  } catch (error) {if(error!==rollback) throw error}
  finally {for (const restore of [...originals.keys()].reverse()) restore();await prisma.$disconnect()}
})
