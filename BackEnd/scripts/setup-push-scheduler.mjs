import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
require('dotenv').config()
const {prisma}=require('../dist/config/db.js')
try {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_cron')
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions')
  // Fixed-origin dispatcher. No user data or plaintext secrets in the cron definition.
  await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION public.lecturepulse_dispatch_due_push() RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
    DECLARE request_id bigint;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s JOIN public.user_sync_documents d ON d.user_id=s.user_id
        AND d.document_key='preferences' WHERE d.data->'notifications'->>'pushEnabled'='true') THEN RETURN NULL; END IF;
      SELECT net.http_post(url:='https://lecturepulse-api-tanishk.onrender.com/api/push/dispatch',body:='{}'::jsonb,
        headers:=jsonb_build_object('Content-Type','application/json','x-scheduler-token',
          (SELECT value->>'schedulerToken' FROM public.server_secrets WHERE name='web-push')),timeout_milliseconds:=90000) INTO request_id;
      RETURN request_id;
    END $fn$`)
  await prisma.$executeRawUnsafe('REVOKE ALL ON FUNCTION public.lecturepulse_dispatch_due_push() FROM PUBLIC,anon,authenticated')
  await prisma.$executeRawUnsafe('REVOKE ALL ON net.http_request_queue,net._http_response FROM PUBLIC,anon,authenticated')
  await prisma.$queryRaw`SELECT cron.schedule('lecturepulse-push-reminders','* * * * *','SELECT public.lecturepulse_dispatch_due_push()')`
  console.log('Notification scheduler:',JSON.stringify(await prisma.$queryRaw`SELECT jobname,schedule,active FROM cron.job WHERE jobname='lecturepulse-push-reminders'`))
} catch {console.error('Scheduler setup failed; readiness is not claimed.');process.exitCode=1}
finally {await prisma.$disconnect()}
