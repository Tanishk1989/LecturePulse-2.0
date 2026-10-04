import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import vm from 'node:vm'
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8')
test('closed-tab worker shows safe notifications and restricts click navigation to this site',async()=>{
  const handlers={},shown=[];let opened
  const self={location:{origin:'https://lecturepulse.test'},addEventListener:(name,fn)=>{handlers[name]=fn},registration:{showNotification:async(...args)=>{shown.push(args)}},clients:{matchAll:async()=>[],openWindow:async url=>{opened=url}}}
  vm.runInNewContext(source,{self,URL})
  let finished
  handlers.push({data:{json:()=>({title:'Ready',body:'Notes ready',url:'https://evil.test',tag:'one'})},waitUntil:p=>{finished=p}})
  await finished;assert.equal(shown[0][0],'Ready');assert.equal(shown[0][1].icon,'/favicon.svg')
  handlers.notificationclick({notification:{data:{url:'https://evil.test'},close(){}},waitUntil:p=>{finished=p}})
  await finished;assert.equal(opened,'https://lecturepulse.test/dashboard')
  handlers.push({data:{json:()=>{throw Error('bad')}},waitUntil:p=>{finished=p}})
  await finished;assert.equal(shown[1][0],'LecturePulse')
})
