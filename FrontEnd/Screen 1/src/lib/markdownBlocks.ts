export interface MarkdownBlock {
  type: 'heading' | 'list' | 'paragraph' | 'hr' | 'table' | 'quote' | 'code'
  level?: number
  listType?: 'unordered' | 'ordered'
  items?: string[]
  text?: string
  headers?: string[]
  rows?: string[][]
  language?: string
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'))
}

export function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let paragraph: string[] = []
  let list: MarkdownBlock | null = null
  const flush = () => {
    if (paragraph.length) blocks.push({type:'paragraph', text:paragraph.join(' ')})
    if (list) blocks.push(list)
    paragraph = []; list = null
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {flush(); continue}
    const fence = line.match(/^(`{3,}|~{3,})(.*)$/)
    if (fence) {
      flush()
      const code: string[] = []
      const closing = new RegExp(`^${fence[1][0]}{${fence[1].length},}\\s*$`)
      while (++i < lines.length && !closing.test(lines[i].trim())) code.push(lines[i])
      blocks.push({type:'code', text:code.join('\n'), language:fence[2].trim()})
      continue
    }
    if (line.startsWith('>')) {
      flush()
      const quote: string[] = []
      do {quote.push(lines[i].trim().replace(/^>\s?/, '')); i++}
      while (i < lines.length && lines[i].trim().startsWith('>'))
      i--
      blocks.push({type:'quote', text:quote.join('\n')})
      continue
    }
    const divider = i + 1 < lines.length ? cells(lines[i + 1]) : []
    const headers = cells(line)
    if (line.includes('|') && headers.length > 1 && divider.length === headers.length &&
      divider.every(cell => /^:?-{3,}:?$/.test(cell))) {
      flush()
      i++
      const rows: string[][] = []
      while (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].includes('|')) {
        const row = cells(lines[++i])
        rows.push(headers.map((_, column) => row[column] ?? ''))
      }
      blocks.push({type:'table',headers,rows})
      continue
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {flush(); blocks.push({type:'heading',level:heading[1].length,text:heading[2]});continue}
    if (/^(---|\*\*\*|___)$/.test(line)) {flush();blocks.push({type:'hr'});continue}
    const unordered = line.match(/^[-*+]\s+(.*)$/)
    const ordered = line.match(/^\d+[.)]\s+(.*)$/)
    if (unordered || ordered) {
      const listType = unordered ? 'unordered' : 'ordered'
      if (paragraph.length || (list as MarkdownBlock | null)?.listType !== listType) flush()
      if (!list) list = {type:'list',listType,items:[]}
      list.items!.push((unordered ?? ordered)![1])
      continue
    }
    if (list) flush()
    paragraph.push(line)
  }
  flush()
  return blocks
}
