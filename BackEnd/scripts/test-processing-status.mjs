import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
process.env.DATABASE_URL='postgresql://test:test@localhost:5432/test'
process.env.FIREBASE_PROJECT_ID='lecturepulse-test'
const express=require('express')
const {prisma}=require('../dist/config/db.js')
const {firebaseAuth}=require('../dist/config/firebase.js')
const queue=require('../dist/services/processingQueue.js')
const {deriveProcessingStatus}=require('../dist/utils/processingStatus.js')
const router=require('../dist/routes/lectures.js').default
const {providerRetryDelay,ProviderRateLimitError}=require('../dist/utils/providerRetry.js')
const {chatBudget}=require('../dist/utils/chatBudget.js')

test('chat requests have bounded completion budgets and GPT-OSS reduces reasoning overhead',()=>{
  const small=chatBudget('openai/gpt-oss-120b','system','short input')
  assert.equal(small.reasoning_effort,'low')
  assert.equal(small.max_completion_tokens,4096)
  const long=chatBudget('openai/gpt-oss-120b','s'.repeat(6000),'u'.repeat(8160))
  assert.ok(long.max_completion_tokens<4096)
  assert.ok(long.max_completion_tokens>128)
  assert.equal(chatBudget('other-model','','').reasoning_effort,undefined)
  assert.equal(chatBudget('openai/gpt-oss-120b','','',256).max_completion_tokens,256)
})

test('provider cooldowns honor Retry-After, survive safe error wrapping and have bounded defaults',()=>{
  assert.equal(providerRetryDelay({status:429,headers:{'retry-after':'120'}}),120)
  assert.equal(providerRetryDelay(new ProviderRateLimitError('Rate limit',90)),90)
  assert.equal(providerRetryDelay(new Error('Groq rate limit reached.')),60)
  assert.equal(providerRetryDelay({status:429,headers:{'retry-after':'broken'}}),60)
  assert.equal(providerRetryDelay(new Error('unrelated failure')),null)
})

test('derived statuses distinguish not started, notes generation, notes failure and completion',()=>{
  assert.equal(deriveProcessingStatus('uploaded',null,null).stage,'not_started')
  assert.equal(deriveProcessingStatus('uploaded',null,null).progressPercent,0)
  assert.equal(deriveProcessingStatus('processing','completed','generating').stage,'generating_notes')
  assert.equal(deriveProcessingStatus('completed','completed','failed').stage,'failed')
  assert.equal(deriveProcessingStatus('completed','completed','completed').stage,'ready')
})

test('status endpoints retain owner isolation and never corrupt completed transcripts during stale-note recovery',async()=>{
  const restore=[]
  const stub=(object,key,value)=>{const original=object[key];restore.push(()=>{object[key]=original});object[key]=value}
  const old=new Date(Date.now()-60*60*1000), fresh=new Date()
  let fixture={lecture:{id:'owned',userId:'alice',status:'uploaded',updatedAt:old,fileUrl:''},transcript:null,notes:null,job:null,active:[]}
  let writes=[]
  stub(firebaseAuth,'verifyIdToken',async token=>{if(token!=='alice')throw Error('Invalid');return {uid:'alice'}})
  stub(prisma.lecture,'findFirst',async q=>{assert.equal(q.where.userId,'alice');return q.where.id==='owned'?fixture.lecture:null})
  stub(prisma.lecture,'findMany',async q=>{assert.equal(q.where.userId,'alice');return [fixture.lecture]})
  for(const [model,key] of [[prisma.transcript,'transcript'],[prisma.lectureNote,'notes']]) {
    stub(model,'findFirst',async q=>{assert.deepEqual(q.where,{lectureId:'owned',userId:'alice'});return fixture[key]})
    stub(model,'update',async q=>{writes.push(key);return q.data})
  }
  stub(prisma.lecture,'update',async q=>{writes.push('lecture');return q.data})
  stub(queue,'getProcessingJob',async (id,uid)=>{assert.equal(id,'owned');assert.equal(uid,'alice');return fixture.job})
  stub(prisma,'$queryRaw',async (_sql,uid)=>{assert.equal(uid,'alice');return fixture.active})
  const app=express();app.use('/lectures',router)
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve))
  const request=async(path,token='alice')=>{
    const r=await fetch(`http://127.0.0.1:${server.address().port}/lectures${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{}})
    return {status:r.status,data:await r.json()}
  }
  try {
    assert.equal((await request('/owned/processing-status',null)).status,401)
    assert.equal((await request('/foreign/processing-status')).status,404)
    assert.equal((await request('/owned/processing-status')).data.stage,'not_started')
    assert.deepEqual(writes,[])
    fixture={...fixture,lecture:{...fixture.lecture,status:'processing'},transcript:{id:'t',status:'completed',updatedAt:old},notes:{id:'n',status:'generating',updatedAt:fresh}}
    assert.equal((await request('/owned/processing-status')).data.stage,'generating_notes')
    assert.deepEqual(writes,[])
    fixture.notes.updatedAt=old
    assert.equal((await request('/owned/processing-status')).data.stage,'failed')
    assert.deepEqual(writes,['lecture','notes'])
    writes=[]
    fixture.job={state:'queued',attempts:1}
    fixture.lecture.status='failed';fixture.transcript.status='failed';fixture.notes.status='failed'
    const queued=(await request('/owned/processing-status')).data
    assert.equal(queued.isProcessing,true);assert.notEqual(queued.stage,'failed');assert.ok(queued.progressPercent>0)
    fixture.active=[{lecture_id:'owned'}]
    assert.equal((await request('')).data[0].status,'processing')
    assert.deepEqual(writes,[])
  } finally {
    await new Promise(resolve=>server.close(resolve))
    for(const fn of restore.reverse())fn()
  }
})
