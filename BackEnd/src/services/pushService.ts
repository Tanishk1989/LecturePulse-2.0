import { createHash, randomBytes, randomUUID, ECDH, timingSafeEqual } from 'node:crypto'
import webpush from 'web-push'
import { prisma } from '../config/db'

type PushKeys = { publicKey: string; privateKey: string; schedulerToken: string }
let keys: PushKeys | undefined
const contact = 'https://lecture-pulse-2-0.vercel.app/'

export async function initializePushKeys() {
  const generated = { ...webpush.generateVAPIDKeys(), schedulerToken: randomBytes(32).toString('hex') }
  await prisma.$executeRaw`INSERT INTO server_secrets(name,value) VALUES ('web-push',${JSON.stringify(generated)}::jsonb) ON CONFLICT DO NOTHING`
  const rows = await prisma.$queryRaw<Array<{ value: PushKeys }>>`SELECT value FROM server_secrets WHERE name='web-push'`
  keys = rows[0].value
}
export function pushPublicKey() { if (!keys) throw Error('Push is not initialized'); return keys.publicKey }
export function validSchedulerToken(token: unknown) {
  if (typeof token !== 'string' || token.length !== 64 || !keys) return false
  // Constant-time comparison without logging or exposing either value.
  return timingSafeEqual(createHash('sha256').update(token).digest(), createHash('sha256').update(keys.schedulerToken).digest())
}
export function subscriptionId(endpoint: string) { return createHash('sha256').update(endpoint).digest('hex') }
export function validPushSubscription(value: any): boolean {
  try {
    if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) return false
    const url = new URL(value.endpoint)
    const host = url.hostname
    const trusted = host === 'fcm.googleapis.com' || host === 'updates.push.services.mozilla.com'
      || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com')
    if (!(trusted && url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
      && typeof value.keys?.p256dh === 'string' && /^[A-Za-z0-9_-]{87}$/.test(value.keys.p256dh)
      && typeof value.keys?.auth === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value.keys.auth))) return false
    ECDH.convertKey(Buffer.from(value.keys.p256dh,'base64url'),'prime256v1')
    return Buffer.from(value.keys.auth,'base64url').length===16
  } catch { return false }
}

export function localClock(now: Date, timezone: string) {
  let parts: Intl.DateTimeFormatPart[]
  try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(now) }
  catch { return localClock(now, 'UTC') }
  const field = (type: string) => parts.find(part => part.type === type)?.value ?? ''
  return { date:`${field('year')}-${field('month')}-${field('day')}`, minute:Number(field('hour'))*60+Number(field('minute')), weekday:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(field('weekday')) }
}
export function recentlyDue(current: number, target: string, grace = 10) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(target)) return false
  const [h,m] = target.split(':').map(Number)
  return current >= h*60+m && current - (h*60+m) <= grace
}

export async function queuePush(uid: string, event: string, payload: { title: string; body: string; url: string }) {
  await prisma.$executeRaw`INSERT INTO push_deliveries(subscription_id,event_key,user_id,payload)
    SELECT id,${event},user_id,${JSON.stringify({ ...payload, tag: event })}::jsonb FROM push_subscriptions WHERE user_id=${uid}
    ON CONFLICT DO NOTHING`
}

let scheduling = false
export async function schedulePushNotifications(now = new Date()) {
  if (scheduling) return
  scheduling = true
  try {
    let cursor = ''
    while (true) {
      const users = await prisma.$queryRaw<Array<{ user_id: string; since: Date }>>`
        SELECT user_id,MIN(created_at) AS since FROM push_subscriptions WHERE user_id>${cursor} GROUP BY user_id ORDER BY user_id LIMIT 100`
      if (!users.length) break
      for (const user of users) {
        const uid = user.user_id
        const docs = await prisma.$queryRaw<Array<{ document_key: string; data: any }>>`
          SELECT document_key,data FROM user_sync_documents WHERE user_id=${uid} AND document_key IN ('preferences','timetable')`
        const prefs = docs.find(doc => doc.document_key === 'preferences')?.data
        if (prefs?.notifications?.pushEnabled !== true) continue
        const clock = localClock(now, prefs.general?.timezone || 'UTC')
        const profile = await prisma.userProfile.findUnique({ where: { userId: uid } })
        if (profile?.dailyReminder && recentlyDue(clock.minute, profile.dailyReminderTime || '09:00')) {
          await queuePush(uid, `daily:${clock.date}`, { title:'Study reminder',body:'Time to review your lectures and flashcards.',url:'/dashboard/revision' })
        }
        if (recentlyDue(clock.minute,'09:00')) {
          const due = await prisma.flashcard.count({ where:{userId:uid,lecture:{userId:uid},OR:[{nextReviewAt:null},{nextReviewAt:{lte:now}}]} })
          if (due) await queuePush(uid, `cards:${clock.date}`, { title:'Flashcards due',body:`${due} cards are ready for review.`,url:'/dashboard/flashcards' })
        }
        if (profile?.streakAlerts && recentlyDue(clock.minute,'20:00')) {
          const streak = await prisma.userStreak.findUnique({where:{userId:uid}})
          if (streak && streak.currentStreak > 0 && (!streak.lastActiveDate || localClock(streak.lastActiveDate,prefs.general?.timezone || 'UTC').date !== clock.date)) {
            await queuePush(uid, `streak:${clock.date}`, {title:'Keep your streak alive',body:'A quick review today keeps your study streak going.',url:'/dashboard/revision'})
          }
        }
        if (prefs.notifications.weeklyDigest === true && clock.weekday === 0 && recentlyDue(clock.minute,'09:30')) {
          await queuePush(uid, `weekly:${clock.date}`, {title:'Weekly study digest',body:'Your lecture library and revision cards are ready for the week ahead.',url:'/dashboard'})
        }
        const timetable = docs.find(doc => doc.document_key === 'timetable')?.data
        if (Array.isArray(timetable)) for (const entry of timetable) {
          if (entry.autoRecordReminder && entry.dayOfWeek === clock.weekday && recentlyDue(clock.minute,entry.startTime,5)) {
            await queuePush(uid, `class:${entry.id}:${clock.date}`, {title:'Class starting',body:'Your scheduled class is starting. Open LecturePulse to record it.',url:'/dashboard/record'})
          }
        }
        if (prefs.notifications.notesReady === true) {
          const notes = await prisma.lectureNote.findMany({where:{userId:uid,status:'completed',lecture:{userId:uid},updatedAt:{gte:new Date(Math.max(user.since.getTime(),now.getTime()-86400_000))}},select:{id:true,lectureId:true,updatedAt:true},orderBy:{updatedAt:'desc'},take:1000})
          for (const note of notes) await queuePush(uid,`notes:${note.id}:${note.updatedAt.toISOString()}`,{title:'Notes ready',body:'Your new lecture notes are ready to study.',url:`/notes/${note.lectureId}`})
        }
      }
      cursor = users[users.length-1].user_id
    }
    await prisma.$executeRaw`DELETE FROM push_deliveries WHERE created_at<clock_timestamp()-INTERVAL '14 days' AND state IN ('sent','failed')`
  } finally { scheduling = false }
}

let sending = false
export async function deliverPushNotifications() {
  if (sending || !keys) return
  sending = true
  try {
    await prisma.$executeRaw`UPDATE push_deliveries SET state='failed',lease_token=NULL,lease_until=NULL WHERE state='running' AND attempts>=3 AND lease_until<clock_timestamp()`
    for (let i=0;i<50;i++) {
      const token = randomUUID()
      const rows = await prisma.$queryRaw<Array<{ subscription_id:string; event_key:string; user_id:string; payload:any; subscription:any }>>`
        WITH candidate AS (SELECT subscription_id,event_key FROM push_deliveries WHERE attempts<3 AND
          ((state='queued' AND available_at<=clock_timestamp()) OR (state='running' AND lease_until<clock_timestamp()))
          ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE push_deliveries d SET state='running',attempts=attempts+1,lease_token=${token},lease_until=clock_timestamp()+INTERVAL '60 seconds'
        FROM candidate c,push_subscriptions s WHERE d.subscription_id=c.subscription_id AND d.event_key=c.event_key
          AND s.id=d.subscription_id AND s.user_id=d.user_id
        RETURNING d.subscription_id,d.event_key,d.user_id,d.payload,s.subscription`
      const job = rows[0]
      if (!job) break
      try {
        const prefs = await prisma.$queryRaw<Array<{data:any}>>`SELECT data FROM user_sync_documents WHERE user_id=${job.user_id} AND document_key='preferences'`
        if (prefs[0]?.data?.notifications?.pushEnabled === true) {
          if (!validPushSubscription(job.subscription)) throw Error('Invalid subscription')
          await webpush.sendNotification(job.subscription, JSON.stringify(job.payload), {vapidDetails:{subject:contact,publicKey:keys.publicKey,privateKey:keys.privateKey},TTL:600,timeout:10_000})
        }
        await prisma.$executeRaw`UPDATE push_deliveries SET state='sent',lease_token=NULL,lease_until=NULL WHERE subscription_id=${job.subscription_id} AND event_key=${job.event_key} AND lease_token=${token}`
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.$executeRaw`DELETE FROM push_subscriptions WHERE id=${job.subscription_id} AND user_id=${job.user_id}`
        } else {
          await prisma.$executeRaw`UPDATE push_deliveries SET state=CASE WHEN attempts<3 THEN 'queued' ELSE 'failed' END,
            available_at=clock_timestamp()+INTERVAL '60 seconds',lease_token=NULL,lease_until=NULL
            WHERE subscription_id=${job.subscription_id} AND event_key=${job.event_key} AND lease_token=${token}`
        }
      }
    }
  } finally { sending = false }
}

export function startPushWorker() {
  const run = () => { void schedulePushNotifications().then(deliverPushNotifications).catch(() => console.error('[Push] Scheduled delivery will retry.')) }
  const timer = setInterval(run,60_000);run()
  return () => clearInterval(timer)
}
