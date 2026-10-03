// Read-only deployment verification; never prints credentials, user IDs or stored document content.
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
require('dotenv').config()
const {prisma}=require('../dist/config/db.js')
try {
  const tables=await prisma.$queryRaw`
    SELECT c.relname AS table,c.relrowsecurity AS rls,
      has_table_privilege('anon',c.oid,'SELECT') AS anon_read,
      has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_read
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('processing_jobs','user_sync_documents') ORDER BY c.relname`
  console.log('Persistence table security:',JSON.stringify(tables))
  if(tables.length!==2 || tables.some(t=>!t.rls||t.anon_read||t.authenticated_read)) throw Error('Persistence table security is not ready')
  console.log('Job states:',JSON.stringify(await prisma.$queryRaw`SELECT state,COUNT(*)::integer AS count FROM processing_jobs GROUP BY state`))
  console.log('Sync summary:',JSON.stringify(await prisma.$queryRaw`
    SELECT CASE WHEN document_key LIKE 'tutor-history:%' THEN 'tutor-history' ELSE document_key END AS kind,
      COUNT(*)::integer AS count,MAX(revision) AS latest_revision FROM user_sync_documents GROUP BY kind ORDER BY kind`))
} catch {console.error('Persistence deployment verification failed.');process.exitCode=1}
finally {await prisma.$disconnect()}
