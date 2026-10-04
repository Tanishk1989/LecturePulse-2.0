import { Router } from 'express'
import { prisma } from '../config/db'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { sendRouteError } from '../utils/apiError'
import { pushPublicKey, validPushSubscription, subscriptionId, queuePush, deliverPushNotifications, schedulePushNotifications, validSchedulerToken } from '../services/pushService'

const router = Router()
router.post('/dispatch',async (req,res) => {
  if (!validSchedulerToken(req.headers['x-scheduler-token'])) return res.status(401).json({error:'Unauthorized'})
  try { await schedulePushNotifications();await deliverPushNotifications();res.json({success:true}) }
  catch (error) { sendRouteError(res,error,'Notification dispatch failed.') }
})
router.use(requireAuth)
router.get('/config',(_req,res) => res.json({publicKey:pushPublicKey()}))
router.post('/subscribe',async(req:AuthenticatedRequest,res) => {
  const subscription = req.body?.subscription
  if (!validPushSubscription(subscription)) return res.status(400).json({error:'Unsupported or invalid push subscription.'})
  const id = subscriptionId(subscription.endpoint)
  try {
    // A browser subscription belongs to only one signed-in account; do not silently reassign it.
    const rows = await prisma.$queryRaw<Array<{ id:string }>>`
      INSERT INTO push_subscriptions(id,user_id,subscription) VALUES (${id},${req.user!.uid},${JSON.stringify(subscription)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET subscription=EXCLUDED.subscription,updated_at=NOW()
      WHERE push_subscriptions.user_id=EXCLUDED.user_id RETURNING id`
    if (!rows.length) return res.status(409).json({error:'This browser subscription belongs to another account. Re-enable notifications on this device.'})
    res.json({success:true})
  } catch(error) {sendRouteError(res,error,'Could not enable notifications.')}
})
router.post('/unsubscribe',async(req:AuthenticatedRequest,res) => {
  if (typeof req.body?.endpoint !== 'string') return res.status(400).json({error:'Invalid subscription.'})
  try {
    await prisma.$executeRaw`DELETE FROM push_subscriptions WHERE id=${subscriptionId(req.body.endpoint)} AND user_id=${req.user!.uid}`
    res.json({success:true})
  } catch(error) {sendRouteError(res,error,'Could not disable notifications.')}
})
router.post('/test',async(req:AuthenticatedRequest,res) => {
  try {
    const prefs=await prisma.$queryRaw<Array<{data:any}>>`SELECT data FROM user_sync_documents WHERE user_id=${req.user!.uid} AND document_key='preferences'`
    if (prefs[0]?.data?.notifications?.pushEnabled !== true) return res.status(409).json({error:'Wait for notification preferences to finish cloud syncing, then retry.'})
    const result = await prisma.$queryRaw<Array<{count:number}>>`SELECT COUNT(*)::integer AS count FROM push_subscriptions WHERE user_id=${req.user!.uid}`
    if (!result[0]?.count) return res.status(400).json({error:'Enable notifications on this browser first.'})
    // One self-test per minute; no client-provided recipients or message text.
    await queuePush(req.user!.uid,`test:${Math.floor(Date.now()/60_000)}`,{title:'LecturePulse notifications',body:'Server push is connected on this device.',url:'/dashboard/settings?section=notifications'})
    await deliverPushNotifications();res.json({success:true})
  } catch(error) {sendRouteError(res,error,'Notification test failed.')}
})
export default router
