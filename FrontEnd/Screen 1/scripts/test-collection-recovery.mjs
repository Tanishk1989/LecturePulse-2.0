import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real collection hooks with a tiny deterministic hook runtime.
// Services are mocked; these tests never read or mutate a production account.
async function collectionHarness(file, exportName) {
  const h = { user: {uid:'alice'}, values: [], cursor: 0, read: async () => [] }
  const react = {
    useState(initial) {
      const index = h.cursor++
      if (!(index in h.values)) h.values[index] = typeof initial === 'function' ? initial() : initial
      return [h.values[index], value => { h.values[index] = typeof value === 'function' ? value(h.values[index]) : value }]
    },
    useRef(initial) {
      const index = h.cursor++
      if (!(index in h.values)) h.values[index] = {current:initial}
      return h.values[index]
    },
    useCallback: fn => fn, useEffect: () => {}, useMemo: fn => fn(), createContext: () => ({}),
  }
  const source = await readFile(new URL(`../src/hooks/${file}`,import.meta.url),'utf8')
  const compiled = ts.transpileModule(`${source}\nexport {${exportName} as testedHook}`, {
    compilerOptions: {target:ts.ScriptTarget.ES2023,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  }).outputText
  const exports = {}
  const services = new Proxy({}, {get:()=> (...args) => h.read(...args)})
  vm.runInNewContext(compiled, {exports, console, Error, require: name => {
    if (name === 'react') return react
    if (name === '@/context/AuthContext') return {useAuthContext:()=>({user:h.user})}
    if (name === '@/components/ui/ToastProvider') return {useToast:()=>({toast:{error:()=>{}}})}
    return services
  }})
  h.render = () => { h.cursor = 0; return exports.testedHook() }
  return h
}

for (const [file, hook, field] of [['useUserNotes.ts','useUserNotes','notes'],['useFlashcards.ts','useFlashcards','flashcards'],['useLectures.tsx','useLecturesState','lectures']]) {
  test(`${hook}: failures preserve loaded records, retry recovers, and stale account responses are discarded`, async () => {
    const h = await collectionHarness(file,hook)
    const saved = [{id:'saved'}]
    h.read = async () => saved
    await h.render().refresh()
    assert.deepEqual(h.render()[field],saved)
    assert.equal(h.render().loading,false)
    h.read = async () => { throw new Error('API unavailable') }
    await h.render().refresh()
    assert.equal(h.render().error,'API unavailable')
    assert.deepEqual(h.render()[field],saved)
    h.read = async () => [{id:'recovered'}]
    await h.render().refresh()
    assert.equal(h.render().error,null)
    assert.equal(h.render()[field][0].id,'recovered')

    let finishOld
    h.read = () => new Promise(resolve=>{finishOld=resolve})
    const oldRead = h.render().refresh()
    h.user = {uid:'bob'}
    h.read = async () => [{id:'bob-owned'}]
    await h.render().refresh()
    finishOld([{id:'alice-owned'}])
    await oldRead
    assert.equal(h.render()[field][0].id,'bob-owned')
    h.user = null
    await h.render().refresh()
    assert.equal(h.render()[field].length,0)
    assert.equal(h.render().error,null)
  })
}
