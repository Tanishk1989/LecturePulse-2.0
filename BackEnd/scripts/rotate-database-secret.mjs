// Run only after explicit authorization. Values are never printed; local edits use apply_patch.
import {createRequire} from 'node:module'
import {readFileSync,existsSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import path from 'node:path'
const require=createRequire(import.meta.url)
require('dotenv').config()
if(process.env.AUTHORIZED_DB_ROTATION!=='true')throw Error('Explicit database rotation authorization is required.')
const executable=process.env.CODEX_APPLY_PATCH_EXE
if(!executable||!existsSync(executable))throw Error('Verified apply_patch executable required.')
const {prisma}=require('../dist/config/db.js')
const envPath=path.resolve('.env').replace(/\\/g,'/')
const bridgePath=path.resolve('.runtime/db-rotation.json').replace(/\\/g,'/')
const original=readFileSync(envPath,'utf8')
const currentURL=new URL(process.env.DATABASE_URL)
const password=randomBytes(32).toString('hex')
const nextURL=new URL(currentURL);nextURL.password=password
function patch(input){
  try{execFileSync(executable,['--codex-run-as-apply-patch',input],{stdio:['ignore','pipe','pipe']})}
  catch{throw Error('Secure local configuration update failed.')}
}
function replaceEnv(from,to){
  patch(`*** Begin Patch\n*** Update File: ${envPath}\n@@\n${from.trimEnd().split(/\r?\n/).map(line=>'-'+line).join('\n')}\n${to.trimEnd().split(/\r?\n/).map(line=>'+'+line).join('\n')}\n*** End Patch`)
}
let localPrepared=false,rotated=false,stage='preflight'
try{
  if(existsSync(bridgePath))throw Error('Previous rotation record exists; review it before another rotation.')
  stage='role-check'
  const rows=await prisma.$queryRaw`SELECT current_user`
  if(rows[0].current_user!=='postgres')throw Error('Unexpected database role; rotation stopped.')
  const updated=original.replace(/^(DATABASE_URL|DIRECT_URL)\s*=.*$/gm,(line,key)=>{
    if(key==='DATABASE_URL')return `${key}="${nextURL.href}"`
    try{const parsed=new URL(require('dotenv').parse(line)[key]);if(parsed.password===currentURL.password){parsed.password=password;return `${key}="${parsed.href}"`}}catch{}
    return line
  }) + (original.includes('FIREBASE_PROJECT_ID=')?'':'\nFIREBASE_PROJECT_ID="lecturepulse-f0489"\n')
  stage='local-env-patch'
  replaceEnv(original,updated);localPrepared=true
  const record=JSON.stringify({databaseURL:nextURL.href,previousDatabaseURL:currentURL.href,projectId:'lecturepulse-f0489',createdAt:new Date().toISOString()})
  stage='handoff-record-patch'
  patch(`*** Begin Patch\n*** Add File: ${bridgePath}\n+${record}\n*** End Patch`)
  // Random hex is generated internally, never supplied by a request or interpolated from external input.
  stage='database-password-change'
  await prisma.$executeRawUnsafe(`ALTER ROLE postgres PASSWORD '${password}'`)
  rotated=true
  console.log('Database secret rotated; local backend updated. Protected Render handoff record prepared in ignored runtime storage.')
}catch(error){
  if(localPrepared&&!rotated){try{replaceEnv(readFileSync(envPath,'utf8'),original);patch(`*** Begin Patch\n*** Delete File: ${bridgePath}\n*** End Patch`)}catch{}}
  console.error(`Database rotation stopped at ${stage}; no secret values were logged.`);process.exitCode=1
  if(stage==='database-password-change')console.error(JSON.stringify({code:error?.code,sqlState:error?.meta?.code,permissionDenied:/permission|superuser|reserved|not allowed/i.test(error?.meta?.message||'')}))
}finally{await prisma.$disconnect()}
