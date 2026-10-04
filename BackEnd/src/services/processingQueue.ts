import { randomUUID } from 'node:crypto'
import { prisma } from '../config/db'
import { triggerLectureProcessing, type ProcessLectureOptions } from './processingService'
import { acquireAiPermit, releaseAiPermit, renewAiPermit } from './sharedAiLimit'

interface Job { lectureId: string; userId: string; options: ProcessLectureOptions; attempts: number }
let working = false
let stopped = false
let timer: ReturnType<typeof setInterval> | undefined

export async function enqueueProcessingJob(lectureId: string, userId: string, options: ProcessLectureOptions) {
  return prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ state: string }>>`
      INSERT INTO processing_jobs (lecture_id,user_id,options) VALUES (${lectureId},${userId},${JSON.stringify(options)}::jsonb)
      ON CONFLICT (lecture_id) DO UPDATE SET
        options=CASE WHEN processing_jobs.state IN ('queued','running') THEN processing_jobs.options ELSE EXCLUDED.options END,
        state=CASE WHEN processing_jobs.state IN ('queued','running') THEN processing_jobs.state ELSE 'queued' END,
        attempts=CASE WHEN processing_jobs.state IN ('queued','running') THEN processing_jobs.attempts ELSE 0 END,
        available_at=CASE WHEN processing_jobs.state IN ('queued','running') THEN processing_jobs.available_at ELSE NOW() END,
        last_error=NULL, updated_at=NOW()
      WHERE processing_jobs.user_id=EXCLUDED.user_id RETURNING state`
    if (!rows.length) throw new Error('Lecture not found.')
    await tx.lecture.update({ where: { id: lectureId }, data: { status: 'processing' } })
    return rows[0].state
  })
}

export async function getProcessingJob(lectureId: string, userId: string) {
  const rows = await prisma.$queryRaw<Array<{ state: string; attempts: number }>>`
    SELECT state,attempts FROM processing_jobs WHERE lecture_id=${lectureId} AND user_id=${userId}`
  return rows[0] ?? null
}

export async function recoverProcessingJobs() {
  // Legacy jobs that were in flight before this queue existed are also recoverable.
  await prisma.$executeRaw`
    INSERT INTO processing_jobs (lecture_id,user_id)
    SELECT l.id,l.user_id FROM lectures l WHERE l.status='processing'
      OR EXISTS (SELECT 1 FROM transcripts t WHERE t.lecture_id=l.id AND t.user_id=l.user_id AND (t.status='processing' OR t.status LIKE 'transcribing%'))
      OR EXISTS (SELECT 1 FROM lecture_notes n WHERE n.lecture_id=l.id AND n.user_id=l.user_id AND n.status='generating')
    ON CONFLICT (lecture_id) DO NOTHING`
}

export async function runProcessingQueueOnce() {
  if (working || stopped) return
  working = true
  try {
    await prisma.$executeRaw`
      WITH exhausted AS (
        UPDATE processing_jobs SET state='failed',last_error='Processing interrupted too many times. Please retry.',updated_at=NOW()
        WHERE state='running' AND lease_until<NOW() AND attempts>=3 RETURNING lecture_id,user_id
      ) UPDATE lectures l SET status='failed' FROM exhausted e WHERE l.id=e.lecture_id AND l.user_id=e.user_id AND l.status='processing'`
    const token = randomUUID()
    const jobs = await prisma.$queryRaw<Job[]>`
      WITH candidate AS (
        SELECT lecture_id FROM processing_jobs WHERE attempts<3 AND
          ((state='queued' AND available_at<=NOW()) OR (state='running' AND lease_until<NOW()))
        ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1
      ) UPDATE processing_jobs j SET state='running',attempts=j.attempts+1,
          lease_token=${token},lease_until=NOW()+INTERVAL '180 seconds',updated_at=NOW()
        FROM candidate c WHERE j.lecture_id=c.lecture_id
        RETURNING j.lecture_id AS "lectureId",j.user_id AS "userId",j.options,j.attempts`
    const job = jobs[0]
    if (!job) return
    const permit = await acquireAiPermit(job.userId)
    if (!permit.token) {
      const seconds = Math.max(5, permit.retryAfter ?? 30)
      await prisma.$executeRaw`UPDATE processing_jobs SET state='queued',attempts=attempts-1,
        available_at=clock_timestamp()+${seconds}*INTERVAL '1 second',lease_until=NULL,lease_token=NULL
        WHERE lecture_id=${job.lectureId} AND lease_token=${token}`
      return
    }
    let leaseLost = false
    const assertActive = async () => {
      if (leaseLost) throw new Error('Processing lease expired.')
      await renewAiPermit(permit.token!)
      const updated = await prisma.$executeRaw`
        UPDATE processing_jobs SET lease_until=NOW()+INTERVAL '180 seconds',updated_at=NOW()
        WHERE lecture_id=${job.lectureId} AND state='running' AND lease_token=${token} AND lease_until>NOW()`
      if (!updated) { leaseLost = true; throw new Error('Processing lease expired.') }
    }
    const heartbeat = setInterval(() => { void assertActive().catch(() => { leaseLost = true }) }, 30_000)
    try {
      await assertActive()
      await triggerLectureProcessing(job.lectureId, job.userId, {
        ...job.options, forceRetranscribe: job.attempts === 1 && job.options.forceRetranscribe === true, assertActive,
      })
      await assertActive()
      await prisma.$executeRaw`
        UPDATE processing_jobs SET state='completed',lease_until=NULL,lease_token=NULL,last_error=NULL,updated_at=NOW()
        WHERE lecture_id=${job.lectureId} AND lease_token=${token}`
    } catch {
      // No raw provider/database details are persisted in queue metadata.
      await prisma.$executeRaw`
        UPDATE processing_jobs SET state=CASE WHEN attempts<3 THEN 'queued' ELSE 'failed' END,
          available_at=NOW()+INTERVAL '30 seconds',lease_until=NULL,lease_token=NULL,
          last_error='Processing failed. Please retry if automatic recovery does not succeed.',updated_at=NOW()
        WHERE lecture_id=${job.lectureId} AND lease_token=${token}`
    } finally { clearInterval(heartbeat);await releaseAiPermit(permit.token).catch(() => {}) }
  } catch { console.error('[ProcessingQueue] Worker check failed; it will retry.') }
  finally { working = false }
}

export function startProcessingWorker() {
  stopped = false
  timer = setInterval(() => { void runProcessingQueueOnce() }, 5000)
  void runProcessingQueueOnce()
  return () => { stopped = true; if (timer) clearInterval(timer) }
}
