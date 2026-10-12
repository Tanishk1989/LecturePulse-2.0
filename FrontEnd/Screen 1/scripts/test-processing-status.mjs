import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const compile = source => ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const load = async file => import(`data:text/javascript;base64,${Buffer.from(compile(await readFile(new URL(file,import.meta.url),'utf8'))).toString('base64')}`)
const {resolveHubStatus} = await load('../src/lib/notesHubStatus.ts')
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
