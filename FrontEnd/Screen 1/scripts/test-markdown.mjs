import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdown } from '../src/lib/markdownBlocks.ts'
test('table rows and escaped pipes produce semantic cells', () => {
  const blocks = parseMarkdown('| Step | Outcome |\n| --- | :---: |\n| Debit | **Rollback** |\n| Credit | A\\|B |')
  assert.equal(blocks[0].type,'table')
  assert.deepEqual(blocks[0].headers,['Step','Outcome'])
  assert.deepEqual(blocks[0].rows,[['Debit','**Rollback**'],['Credit','A|B']])
})
test('quotes and fenced code retain line breaks, do not parse code as headings/tables', () => {
  const blocks = parseMarkdown('> Atomicity\n> All or nothing\n\n```sql\nSELECT *\n# code, not heading\n```')
  assert.deepEqual(blocks.map(block => block.type),['quote','code'])
  assert.equal(blocks[0].text,'Atomicity\nAll or nothing')
  assert.equal(blocks[1].language,'sql')
  assert.equal(blocks[1].text,'SELECT *\n# code, not heading')
})
test('streaming partial fences remain literal code; paragraphs and lists preserve old behavior', () => {
  assert.equal(parseMarkdown('```js\n<script>alert(1)</script>')[0].text,'<script>alert(1)</script>')
  assert.deepEqual(parseMarkdown('### Title\n\n- One\n- Two\n\nPlain text').map(block => block.type),['heading','list','paragraph'])
  assert.equal(parseMarkdown('ordinary | pipe')[0].type,'paragraph')
})
