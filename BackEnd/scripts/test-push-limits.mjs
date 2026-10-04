import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {readFile} from 'node:fs/promises'
import {randomBytes} from 'node:crypto'
const require=createRequire(import.meta.url)
require('dotenv').config()
const {prisma}=require('../dist/config/db.js')
const push=require('../dist/services/pushService.js')
const shared=require('../dist/services/sharedAiLimit.js')
const webpush=require('web-push')
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/fixture',keys:{p256dh:webpush.generateVAPIDKeys().publicKey,auth:randomBytes(16).toString('base64url')}}

test('push subscriptions reject SSRF, credentials, deceptive hosts and invalid encryption keys',()=>{
  assert.equal(push.validPushSubscription(subscription),true)
  for(const endpoint of ['http://fcm.googleapis.com/test','https://localhost/test','https://169.254.169.254/test','https://fcm.googleapis.com.evil.test/test','https://user:password@fcm.googleapis.com/test','https://fcm.googleapis.com:444/test'])assert.equal(push.validPushSubscription({...subscription,endpoint}),false)
  assert.equal(push.validPushSubscription({...subscription,keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}}),false)
  assert.equal(push.validSchedulerToken('fake'),false)
})
test('reminders follow timezone, weekday and bounded catch-up windows',()=>{
  const clock=push.localClock(new Date('2026-10-04T03:32:00Z'),'Asia/Kolkata')
  assert.deepEqual(clock,{date:'2026-10-04',minute:542,weekday:0})
  assert.equal(push.recentlyDue(clock.minute,'09:00'),true)
  assert.equal(push.recentlyDue(clock.minute,'09:05'),false)
  assert.equal(push.recentlyDue(560,'09:00'),false)
  assert.equal(push.recentlyDue(0,'24:00'),false)
  assert.equal(push.localClock(new Date('2026-10-04T03:32:00Z'),'invalid').minute,212)
})
test('push routes block unauthenticated, foreign-account subscriptions and invalid dispatcher tokens',async()=>{
  const express=require('express'),{firebaseAuth}=require('../dist/config/firebase.js')
  const oldAuth=firebaseAuth.verifyIdToken,oldQuery=prisma.$queryRaw,oldExec=prisma.$executeRaw
  let writes=0
  firebaseAuth.verifyIdToken=async()=>({uid:'alice'})
  prisma.$queryRaw=async(sql,...values)=>{assert.ok(values.includes('alice'));writes++;return []}
  prisma.$executeRaw=async(sql,...values)=>{assert.ok(values.includes('alice'));assert.ok(!values.includes('bob'));return 0}
  const app=express();app.use(express.json());app.use('/push',require('../dist/routes/push.js').default)
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r))
  const request=(path,body,auth=true)=>fetch(`http://127.0.0.1:${server.address().port}/push${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer fixture'}:{})},body:JSON.stringify(body)})
  try {
    assert.equal((await request('/subscribe',{subscription},false)).status,401)
    assert.equal((await request('/subscribe',{subscription:{endpoint:'https://localhost'}})).status,400)
    assert.equal(writes,0)
    assert.equal((await request('/subscribe',{subscription,userId:'bob'})).status,409)
    assert.equal((await request('/unsubscribe',{endpoint:subscription.endpoint,userId:'bob'})).status,200)
    assert.equal((await request('/dispatch',{})).status,401)
  } finally {await new Promise(r=>server.close(r));firebaseAuth.verifyIdToken=oldAuth;prisma.$queryRaw=oldQuery;prisma.$executeRaw=oldExec}
})

test('real PostgreSQL shared quotas, leases, push deduplication, delivery retries and expired endpoints', {skip:process.env.RUN_PERSISTENCE_DB_TEST!=='true'},async()=>{
  const rollback=Error('rollback temporary tables'),restore=[]
  const stub=(obj,key,value)=>{const old=obj[key];restore.push(()=>{obj[key]=old});obj[key]=value}
  try {
    await prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe('SET LOCAL search_path TO pg_temp, public')
      const sql=await readFile(new URL('../prisma/migrations/push_and_ai_limits.sql',import.meta.url),'utf8')
      for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await tx.$executeRawUnsafe(statement.replace(/CREATE TABLE IF NOT EXISTS/g,'CREATE TEMP TABLE'))
      await tx.$executeRawUnsafe('CREATE TEMP TABLE user_sync_documents(user_id TEXT,document_key TEXT,data JSONB) ON COMMIT DROP')
      stub(prisma,'$transaction',async fn=>fn(tx));stub(prisma,'$queryRaw',tx.$queryRaw.bind(tx));stub(prisma,'$executeRaw',tx.$executeRaw.bind(tx))
      const first=await shared.acquireAiPermit('alice'),second=await shared.acquireAiPermit('alice')
      assert.ok(first.token&&second.token)
      assert.equal((await shared.acquireAiPermit('alice')).retryAfter,5)
      await shared.releaseAiPermit(first.token);await shared.releaseAiPermit(first.token)
      const third=await shared.acquireAiPermit('alice');assert.ok(third.token)
      await tx.$executeRaw`UPDATE ai_limit_leases SET expires_at=clock_timestamp()-INTERVAL '1 second' WHERE user_id='alice'`
      assert.ok((await shared.acquireAiPermit('alice')).token)
      await tx.$executeRaw`UPDATE ai_limit_buckets SET minute_count=12 WHERE scope='user:alice'`
      assert.ok((await shared.acquireAiPermit('alice')).retryAfter>0)
      await tx.$executeRaw`UPDATE ai_limit_buckets SET minute_count=120 WHERE scope='global'`
      assert.ok((await shared.acquireAiPermit('bob')).retryAfter>0)
      await tx.$executeRaw`UPDATE ai_limit_buckets SET minute_count=0,day_count=5000 WHERE scope='global'`
      assert.ok((await shared.acquireAiPermit('charlie')).retryAfter>60)
      await push.initializePushKeys()
      assert.match(push.pushPublicKey(),/^[A-Za-z0-9_-]{87}$/)
      assert.equal(push.validSchedulerToken('0'.repeat(64)),false)
      await tx.$executeRaw`INSERT INTO user_sync_documents VALUES ('alice','preferences','{"notifications":{"pushEnabled":true}}'::jsonb)`
      const id=push.subscriptionId(subscription.endpoint)
      await tx.$executeRaw`INSERT INTO push_subscriptions(id,user_id,subscription) VALUES (${id},'alice',${JSON.stringify(subscription)}::jsonb)`
      const payload={title:'Test',body:'Safe fixture',url:'/dashboard'}
      await push.queuePush('alice','one',payload);await push.queuePush('alice','one',payload)
      assert.equal((await tx.$queryRaw`SELECT COUNT(*)::integer AS count FROM push_deliveries`)[0].count,1)
      let sends=0
      stub(webpush,'sendNotification',async()=>{sends++})
      await push.deliverPushNotifications();assert.equal(sends,1)
      assert.equal((await tx.$queryRaw`SELECT state FROM push_deliveries WHERE event_key='one'`)[0].state,'sent')
      await push.queuePush('alice','two',payload)
      stub(webpush,'sendNotification',async()=>{throw Error('provider failure')})
      for(let attempt=1;attempt<=3;attempt++){
        await push.deliverPushNotifications()
        const row=(await tx.$queryRaw`SELECT state,attempts FROM push_deliveries WHERE event_key='two'`)[0]
        assert.equal(row.attempts,attempt);assert.equal(row.state,attempt<3?'queued':'failed')
        await tx.$executeRaw`UPDATE push_deliveries SET available_at=clock_timestamp()-INTERVAL '1 second' WHERE event_key='two'`
      }
      await push.queuePush('alice','expired',payload)
      stub(webpush,'sendNotification',async()=>{throw {statusCode:410}})
      await push.deliverPushNotifications()
      assert.equal((await tx.$queryRaw`SELECT COUNT(*)::integer AS count FROM push_subscriptions`)[0].count,0)
      throw rollback
    },{timeout:240_000})
  } catch(error){if(error!==rollback)throw error}
  finally {for(const fn of restore.reverse())fn();await prisma.$disconnect()}
})
