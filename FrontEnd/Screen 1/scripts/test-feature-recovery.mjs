import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const compile = source => ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
const jsxUrl = pathToFileURL(require.resolve('react/jsx-runtime')).href
const transport = await import(moduleUrl(compile(await readFile(new URL('../src/lib/apiTransport.ts', import.meta.url), 'utf8'))))

test('network failures use a readable error and never automatically retry a save', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch') }
  try {
    await assert.rejects(transport.requestApiResponse('https://example.invalid', { method: 'POST' }), e => e.code === 'API_UNAVAILABLE' && e.status === 0)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = original }
})

test('timeouts are readable and caller cancellation is preserved', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (_url, options) => {
    const error = new DOMException('signal timed out', 'TimeoutError')
    throw options.signal.aborted ? options.signal.reason : error
  }
  try {
    await assert.rejects(transport.requestApiResponse('https://example.invalid'), e => e.code === 'API_TIMEOUT' && /too long/.test(e.message))
    const controller = new AbortController()
    controller.abort(new DOMException('user cancelled', 'AbortError'))
    await assert.rejects(transport.requestApiResponse('https://example.invalid', { signal: controller.signal }), e => e.name === 'AbortError' && e.message === 'user cancelled')
  } finally { globalThis.fetch = original }
})

test('transport preserves successful and HTTP error responses for the API layer', async () => {
  const original = globalThis.fetch
  try {
    for (const status of [200, 401, 503]) {
      const response = new Response('{}', { status })
      globalThis.fetch = async () => response
      assert.equal(await transport.requestApiResponse('https://example.invalid'), response)
    }
  } finally { globalThis.fetch = original }
})

const realReact = pathToFileURL(require.resolve('react')).href
const fakeReactUrl = moduleUrl(`import * as react from ${JSON.stringify(realReact)};
export const useState = value => { const next = globalThis.__featureFixture.states.shift(); return [next === undefined ? value : next, () => {}] };
export const useMemo = fn => fn(); export const useCallback = fn => fn; export const useEffect = () => {};
export const useRef = value => ({current:value}); export const createContext = value => react.createContext(value);`)
const dataErrorSource = compile(await readFile(new URL('../src/components/dashboard/ui/DataLoadError.tsx', import.meta.url), 'utf8')).replace(/from ['"]react\/jsx-runtime['"]/g, `from ${JSON.stringify(jsxUrl)}`)
const errorUrl = moduleUrl(dataErrorSource)
const hookResult = { lectures: [], notes: [], flashcards: [], loading: false, error: 'Cannot reach LecturePulse right now.', refresh: async () => {}, metrics: { reviewsDue: 0, masteredCards: 0 }, insights: {}, revisionBuckets: [], lectureTitles: {}, activity: [] }
globalThis.__featureFixture = { states: [], hookResult }
const stubFor = names => moduleUrl(`import {createElement} from ${JSON.stringify(realReact)};
const passthrough = p => createElement('div',null,p?.children);
${names.map(name => {
  let value = 'passthrough'
  if (['useLectures', 'useUserNotes', 'useFlashcards', 'useStudyMetrics', 'useExamFocus'].includes(name)) value = '() => globalThis.__featureFixture.hookResult'
  else if (name === 'useAuthContext') value = '() => ({user:{uid:"test-user"}})'
  else if (name === 'useToast') value = '() => ({toast:{error:()=>{},success:()=>{}}})'
  else if (name === 'useI18n') value = '() => ({translate:key=>key})'
  else if (name === 'useSearchParams') value = '() => [new URLSearchParams("q=atomicity"),()=>{}]'
  else if (name === 'useReducedMotion') value = '() => true'
  else if (name === 'motion') value = '{}'
  else if (name === 'cn') value = '(...args) => args.filter(x=>typeof x==="string").join(" ")'
  else if (name === 'notesHubStats') value = '() => ({total:0,ready:0,pending:0,failed:0})'
  else if (name === 'isAiGenerationConfigured') value = '() => true'
  else if (['countDueFlashcards', 'formatExamFocusTime'].includes(name)) value = '() => 0'
  else if (['sortFlashcardsForStudy', 'filterDueFlashcards'].includes(name)) value = 'cards => cards'
  else if (name === 'SEARCH_FIELD_LABELS') value = '{}'
  return `export const ${name} = ${value};`
}).join('\n')}`)

async function loadPage(name) {
  const source = compile(await readFile(new URL(`../src/pages/dashboard/${name}.tsx`, import.meta.url), 'utf8'))
  const rewritten = source.replace(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g, (match, names, specifier) => {
    const url = specifier === 'react/jsx-runtime' ? jsxUrl : specifier === 'react' ? fakeReactUrl : specifier.endsWith('/DataLoadError') ? errorUrl : stubFor(names.split(',').map(n=>n.trim()).filter(Boolean))
    return `import {${names}} from ${JSON.stringify(url)};`
  })
  return (await import(moduleUrl(rewritten)))[name]
}

for (const [name, states] of [
  ['SmartNotesPage', [new Set(), false, null, 0]], ['FlashcardsPage', []], ['QuizPage', []],
  ['RevisionTimelinePage', []], ['ExamFocusPage', []], ['AnalyticsPage', []],
  ['StreakPage', [null, false, 'Cannot reach LecturePulse right now.']],
  ['ExamCountdownPage', [null, false, 'Cannot reach LecturePulse right now.']],
  ['SearchPage', ['atomicity', [], false, true, 'Cannot reach LecturePulse right now.']],
  ['InstitutionDashboardPage', [null, false, 'Cannot reach LecturePulse right now.']],
]) {
  test(`${name}: failed reads show recovery, not blank, empty, or zero-data claims`, async () => {
    globalThis.__featureFixture.states = [...states]
    const Page = await loadPage(name)
    const html = renderToStaticMarkup(createElement(Page))
    assert.match(html, /role="alert"/)
    assert.match(html, /Cannot reach LecturePulse/)
    assert.match(html, /Try again/)
    assert.doesNotMatch(html, /No lectures yet|No flashcards yet|No matches found|No reviews scheduled|No target exam configured|🔥 Days/)
  })
}

test('shared recovery button retries only when clicked', async () => {
  const { DataLoadError } = await import(errorUrl)
  let retries = 0
  const view = DataLoadError({message:'Disconnected',onRetry:()=>{retries++}})
  assert.equal(retries, 0)
  const button = view.props.children.find(child=>child.type === 'button')
  button.props.onClick()
  assert.equal(retries, 1)
})
