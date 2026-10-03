import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createElement, isValidElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import ts from 'typescript'

const require = createRequire(import.meta.url)
// Compile the actual TSX without a browser, additional dependencies, or generated repository files.
async function loadComponent(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText.replace(/from ['"](react(?:\/jsx-runtime)?|react-router-dom)['"]/g,
    (_, specifier) => `from ${JSON.stringify(pathToFileURL(require.resolve(specifier)).href)}`)
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}

const { AppErrorBoundary } = await loadComponent('../src/components/shared/AppErrorBoundary.tsx')
const { NotFoundPage } = await loadComponent('../src/components/shared/NotFoundPage.tsx')

test('healthy boundary preserves its children unchanged', () => {
  const child = createElement('p', null, 'Normal page')
  assert.equal(new AppErrorBoundary({ children: child }).render(), child)
})

test('render and lazy-import errors produce a safe accessible recovery screen', () => {
  for (const error of [new Error('private credential detail'), new TypeError('Failed to fetch dynamically imported module')]) {
    const boundary = new AppErrorBoundary({ children: null })
    boundary.state = AppErrorBoundary.getDerivedStateFromError(error)
    const html = renderToStaticMarkup(boundary.render())
    assert.match(html, /role="alert"/)
    assert.match(html, /This page couldn&#x27;t load/)
    assert.match(html, /Reload page/)
    assert.match(html, /Unsaved work/)
    assert.match(html, /href="\/"/)
    assert.doesNotMatch(html, /private credential|Failed to fetch/)
  }
})

test('recovery does not reload automatically and reloads only on button click', () => {
  const originalWindow = globalThis.window
  let reloads = 0
  globalThis.window = { location: { reload: () => { reloads++ } } }
  try {
    const boundary = new AppErrorBoundary({ children: null })
    boundary.state = AppErrorBoundary.getDerivedStateFromError(new Error('offline'))
    const findButton = element => {
      if (!isValidElement(element)) return null
      if (element.type === 'button') return element
      const children = Array.isArray(element.props.children) ? element.props.children : [element.props.children]
      return children.map(findButton).find(Boolean)
    }
    const button = findButton(boundary.render())
    assert.equal(reloads, 0)
    assert.ok(button)
    button.props.onClick()
    assert.equal(reloads, 1)
  } finally {
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  }
})

test('404 page provides home and protected library links instead of a blank screen', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(NotFoundPage)))
  assert.match(html, /Page not found/)
  assert.match(html, /href="\/"/)
  assert.match(html, /href="\/dashboard\/lectures"/)
})
