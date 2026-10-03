import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`
const compile = source => ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.ESNext}}).outputText
const mergeUrl=url(compile(await readFile(new URL('../src/lib/syncMerge.ts',import.meta.url),'utf8')))
const {mergeSyncedData}=await import(mergeUrl)
globalThis.__syncTest={auth:{currentUser:{uid:'alice'}},api:null}
const apiUrl=url('export class ApiError extends Error {constructor(status){super("test");this.status=status}}; export const apiFetch=(...args)=>globalThis.__syncTest.api(...args)')
const authUrl=url('export const auth=globalThis.__syncTest.auth')
const source=compile(await readFile(new URL('../src/lib/accountSync.ts',import.meta.url),'utf8'))
  .replace(/from ['"]@\/lib\/api['"]/,`from '${apiUrl}'`).replace(/from ['"]@\/lib\/firebase['"]/,`from '${authUrl}'`).replace(/from ['"]\.\/syncMerge['"]/,`from '${mergeUrl}'`)
const sync=await import(url(source))
const {ApiError}=await import(apiUrl)
class MemoryStorage {
  values=new Map();get length(){return this.values.size}key(i){return [...this.values.keys()][i]??null}
  getItem(k){return this.values.get(k)??null}setItem(k,v){this.values.set(k,String(v))}removeItem(k){this.values.delete(k)}
}
test('three-way merge preserves independent preferences and deletes without resurrecting rows',()=>{
  assert.deepEqual(mergeSyncedData({general:{language:'en'},ai:{style:'balanced'}},{general:{language:'hi'},ai:{style:'balanced'}},{general:{language:'en'},ai:{style:'brief'}}),{general:{language:'hi'},ai:{style:'brief'}})
  assert.deepEqual(mergeSyncedData([{id:'a',title:'old'}],[],[{id:'a',title:'edited'},{id:'b',title:'new'}]),[{id:'b',title:'new'}])
  assert.deepEqual(mergeSyncedData([],[{id:'a',content:'A'}],[{id:'b',content:'B'}]),[{id:'b',content:'B'},{id:'a',content:'A'}])
})
test('merged history is bounded in messages and UTF-8 bytes with stable unique IDs',()=>{
  const messages=Array.from({length:150},(_,i)=>({id:String(i),role:'user',content:'हिंदी '.repeat(1000)}))
  const clean=sync.normalizeTutorHistory(messages)
  assert.ok(clean.length<=100)
  assert.ok(new TextEncoder().encode(JSON.stringify(clean)).byteLength<=95_000)
  const duplicates=sync.normalizeTutorHistory([{id:'a',role:'user',content:'x'},{id:'a',role:'assistant',content:'y'}])
  assert.equal(new Set(duplicates.map(m=>m.id)).size,2)
  assert.deepEqual(sync.normalizeTutorHistory(duplicates),duplicates)
})
test('isolated device caches sync, retry CAS conflicts, retain offline edits and isolate accounts',async()=>{
  const cloud=new Map();let conflict=false
  globalThis.window=new EventTarget()
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}})
  globalThis.localStorage=new MemoryStorage()
  globalThis.__syncTest.api=async(path,options)=>{
    const key=decodeURIComponent(path.split('/')[2]??'')
    if (!options) return key ? cloud.get(key)??{key,data:null,revision:0}:{documents:[...cloud.values()],nextCursor:null}
    const {data,revision}=JSON.parse(options.body)
    if(conflict){conflict=false;cloud.set(key,{key,data:{general:{language:'en'},ai:{style:'brief'}},revision:2});throw new ApiError(409)}
    if(revision!==(cloud.get(key)?.revision??0))throw new ApiError(409)
    const doc={key,data,revision:revision+1};cloud.set(key,doc);return doc
  }
  const settle=()=>new Promise((resolve,reject)=>{
    let stop
    const timeout=setTimeout(()=>{stop?.();reject(new Error('sync timed out'))},3000)
    stop=sync.startAccountSync('alice',status=>{if(status==='saved'){clearTimeout(timeout);stop?.();resolve(stop)}})
  })
  sync.writeSyncedValue('alice','preferences',{general:{language:'en'},ai:{style:'balanced'}})
  ;(await settle())()
  const deviceA=localStorage
  globalThis.localStorage=new MemoryStorage()
  ;(await settle())()
  assert.deepEqual(JSON.parse(localStorage.getItem(sync.syncStorageKey('alice','preferences'))),cloud.get('preferences').data)
  conflict=true
  sync.writeSyncedValue('alice','preferences',{general:{language:'hi'},ai:{style:'balanced'}})
  ;(await settle())()
  assert.deepEqual(cloud.get('preferences').data,{general:{language:'hi'},ai:{style:'brief'}})
  globalThis.localStorage=deviceA
  navigator.onLine=false
  sync.writeSyncedValue('alice','preferences',{general:{language:'en'},ai:{style:'detailed'}})
  const stopOffline=sync.startAccountSync('alice',status=>assert.equal(status,'offline'));stopOffline()
  assert.equal(cloud.get('preferences').data.ai.style,'brief')
  navigator.onLine=true
  ;(await settle())()
  assert.deepEqual(cloud.get('preferences').data,{general:{language:'hi'},ai:{style:'detailed'}})
  localStorage.setItem(sync.syncStorageKey('bob','preferences'),'other account')
  sync.clearAccountSyncCache('alice')
  assert.equal(localStorage.getItem(sync.syncStorageKey('alice','preferences')),null)
  assert.equal(localStorage.getItem(sync.syncStorageKey('bob','preferences')),'other account')
})
