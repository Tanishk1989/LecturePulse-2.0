import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import vm from 'node:vm'
const compile = source => ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const load = async file => import(`data:text/javascript;base64,${Buffer.from(compile(await readFile(new URL(file,import.meta.url),'utf8'))).toString('base64')}`)
const {resolveHubStatus,countHubStatuses} = await load('../src/lib/notesHubStatus.ts')
const {getLectureStatusLabel} = await load('../src/lib/lectureStatus.ts')

test('unstarted uploads are not perpetual processing or generated-title placeholders',()=>{
  assert.equal(resolveHubStatus('uploaded',null,false,false),'not_started')
  assert.equal(getLectureStatusLabel({status:'uploaded'}),'Not started')
})
test('failed lecture without transcript goes to processing retry, not Preparing',()=>{
  assert.equal(resolveHubStatus('failed',null,false,false),'lecture_failed')
  assert.equal(resolveHubStatus('failed',null,false,true),'lecture_failed')
})
test('existing completed notes stay accessible despite missing media or a later failed retry',()=>{
  for(const state of ['uploaded','processing','failed','completed']) {
    assert.equal(resolveHubStatus(state,'completed',false,true),'ready')
  }
})
test('notes-only failures retry notes; real active processing and PDF extraction remain distinct',()=>{
  assert.equal(resolveHubStatus('failed','failed',true,false),'failed')
  assert.equal(resolveHubStatus('processing',null,false,true),'processing_lecture')
  assert.equal(resolveHubStatus('uploaded',null,false,true),'needs_pdf_text')
  assert.equal(resolveHubStatus('completed',null,true,false),'no_notes')
  assert.equal(resolveHubStatus('processing','generating',true,false),'generating')
})

test('hub counts match every visible lecture card, including failed lectures without notes',()=>{
  const statuses = [
    resolveHubStatus('completed','completed',true,false),
    resolveHubStatus('failed',null,false,false),
    resolveHubStatus('failed','failed',true,false),
    resolveHubStatus('processing',null,false,false),
    resolveHubStatus('uploaded',null,false,false),
    resolveHubStatus('uploaded',null,false,true),
  ]
  assert.deepEqual(countHubStatuses(statuses),{total:6,ready:1,pending:1,failed:2,notStarted:2})
})

test('unstarted transcription begins directly and duplicate retries preserve the existing transcript',async()=>{
  const values=[null,'ready',null,'',null,false]
  const effects=[]
  let index=0, calls=[], statusChecks=0, release
  let enqueue=async (id,options)=>{calls.push({id,options})}
  const react={
    useState(initial){const i=index++;if(!(i in values))values[i]=initial;return [values[i],v=>{values[i]=v}]},
    useRef(initial){const i=index++;if(!(i in values))values[i]={current:initial};return values[i]},
    useCallback:fn=>fn,useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),
  }
  const dependencies={
    react,
    '@/context/AuthContext':{useAuthContext:()=>({user:{uid:'alice'}})},
    '@/components/ui/ToastProvider':{useToast:()=>({toast:{success:()=>{},error:()=>{}}})},
    '@/hooks/useProcessingPoll':{useProcessingPoll:()=>{}},
    '@/services/transcriptionService':{isTranscriptionConfigured:()=>true,isTranscribableMediaUrl:()=>true,getTranscriptByLectureId:async()=>null},
    '@/services/aiGenerationService':{AI_UNAVAILABLE_MESSAGE:'unavailable'},
    '@/services/processingService':{isBackgroundProcessingAvailable:()=>true,enqueueLectureProcessing:(...args)=>enqueue(...args),getLectureProcessingStatus:async()=>{statusChecks++;return {isProcessing:false}}},
    '@/lib/processingPreferences':{getProcessingOptions:()=>({outputLanguage:'en'})},
  }
  const source=await readFile(new URL('../src/hooks/useTranscription.ts',import.meta.url),'utf8')
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS}}).outputText
  const exports={}
  vm.runInNewContext(compiled,{exports,Error,console,require:name=>{assert.ok(dependencies[name],name);return dependencies[name]}})
  const hook=exports.useTranscription('owned','https://www.youtube.com/watch?v=abcdefghijk')
  effects.at(-1)()
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(calls.length,1)
  assert.equal(statusChecks,1,'status is refreshed after the enqueue write, not before it')
  enqueue=(id,options)=>{calls.push({id,options});return new Promise(resolve=>{release=resolve})}
  const retry=hook.retryTranscription()
  assert.equal(values[5],false,'do not poll the old failed job while enqueue is pending')
  await hook.retryTranscription()
  assert.equal(calls.length,2,'duplicate retry clicks enqueue only once')
  assert.equal(calls[1].options.forceRetranscribe,false)
  release();await retry
  assert.equal(statusChecks,2,'retry refreshes the newly enqueued job after acknowledgement')
  dependencies['@/services/transcriptionService'].getTranscriptByLectureId=async()=>({status:'completed',text:'Saved transcript'})
  dependencies['@/services/processingService'].getLectureProcessingStatus=async()=>({isProcessing:false,stage:'failed'})
  await hook.refresh()
  index=0
  const recovered=exports.useTranscription('owned','https://www.youtube.com/watch?v=abcdefghijk')
  assert.equal(recovered.phase,'completed','a notes failure must not hide a completed transcript')
  assert.equal(recovered.transcript.text,'Saved transcript')
  assert.match(recovered.error,/transcript is ready/)
  enqueue=async()=>{throw new Error('Temporarily unavailable')}
  await recovered.retryTranscription()
  index=0
  assert.equal(exports.useTranscription('owned','https://www.youtube.com/watch?v=abcdefghijk').phase,'completed','enqueue failures must also keep a completed transcript readable')
})
