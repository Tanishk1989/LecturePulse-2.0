import { jsonResponse } from '../_shared/cors.ts'
import { runInBackground, serveProtectedFunction } from '../_shared/handler.ts'
import { processLectureJob } from '../_shared/processLecture.ts'
import { createAdminClient } from '../_shared/supabaseAdmin.ts'

serveProtectedFunction('process-lecture', 30, async (req, userId) => {
  const body = await req.json()
  const lectureId = body.lectureId

  if (!lectureId || typeof lectureId !== 'string') {
    return jsonResponse({ error: 'lectureId is required.' }, 400)
  }

  const generateNotes = body.generateNotes !== false
  const forceRetranscribe = body.forceRetranscribe === true

  const admin = createAdminClient()

  const { data: lecture, error } = await admin
    .from('lectures')
    .select('id, status')
    .eq('id', lectureId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !lecture) {
    return jsonResponse({ error: 'Lecture not found.' }, 404)
  }

  if (lecture.status === 'processing') {
    return jsonResponse({ status: 'processing', lectureId }, 202)
  }

  await admin
    .from('lectures')
    .update({ status: 'processing' })
    .eq('id', lectureId)
    .eq('user_id', userId)

  runInBackground(
    processLectureJob(admin, lectureId, userId, { generateNotes, forceRetranscribe }).catch(
      (err) => {
        console.error(`process-lecture failed for ${lectureId}:`, err)
      },
    ),
  )

  return jsonResponse({ status: 'processing', lectureId }, 202)
})
