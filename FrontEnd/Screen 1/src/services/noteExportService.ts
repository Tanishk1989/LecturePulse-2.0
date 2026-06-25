import type { StructuredNotesContent } from '@/types/notes'

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

export function buildNotesMarkdown(
  lectureTitle: string,
  content: StructuredNotesContent,
  subject?: string | null,
): string {
  const lines: string[] = [
    `# ${lectureTitle}`,
    '',
    `*Exported from LecturePulse on ${new Date().toLocaleDateString()}*`,
  ]

  if (subject) {
    lines.push('', `**Subject:** ${subject}`)
  }

  if (content.summary?.trim()) {
    lines.push('', '## Summary', '', content.summary.trim())
  }

  if (content.importantPoints.length > 0) {
    lines.push('', '## Important Points', '', bulletList(content.importantPoints))
  }

  if (content.keyConcepts.length > 0) {
    lines.push('', '## Key Concepts')
    for (const concept of content.keyConcepts) {
      lines.push('', `### ${concept.title}`, '', concept.explanation, '', `*Why it matters:* ${concept.importance}`)
    }
  }

  if (content.definitions.length > 0) {
    lines.push('', '## Definitions')
    for (const def of content.definitions) {
      lines.push('', `### ${def.term}`, '', def.definition, '', `*Example:* ${def.example}`)
    }
  }

  if (content.questions.length > 0) {
    lines.push('', '## Study Questions')
    for (const q of content.questions) {
      lines.push('', `**[${q.difficulty}]** ${q.question}`, '', `*Answer:* ${q.answer}`)
    }
  }

  if (content.examTips) {
    if (content.examTips.mostImportant.length > 0) {
      lines.push('', '## Exam Tips — Most Important', '', bulletList(content.examTips.mostImportant))
    }
    if (content.examTips.commonMistakes.length > 0) {
      lines.push('', '## Common Mistakes', '', bulletList(content.examTips.commonMistakes))
    }
    if (content.examTips.topicsToRevise.length > 0) {
      lines.push('', '## Topics to Revise', '', bulletList(content.examTips.topicsToRevise))
    }
  }

  return `${lines.join('\n').trim()}\n`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function markdownToSimpleHtml(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<br />'
      if (trimmed.startsWith('# ')) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`
      if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`
      if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`
      if (trimmed.startsWith('- ')) return `<li>${escapeHtml(trimmed.slice(2))}</li>`
      if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
        return `<p><em>${escapeHtml(trimmed.slice(1, -1))}</em></p>`
      }
      return `<p>${escapeHtml(trimmed)}</p>`
    })
    .join('\n')
}

export function downloadMarkdownFile(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadNotesAsPdf(lectureTitle: string, markdown: string): void {
  const htmlBody = markdownToSimpleHtml(markdown)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(lectureTitle)} — LecturePulse</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.6; padding: 40px; max-width: 760px; margin: 0 auto; }
      h1 { font-size: 28px; margin-bottom: 8px; }
      h2 { font-size: 20px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
      h3 { font-size: 16px; margin-top: 18px; color: #333; }
      p, li { font-size: 14px; }
      li { margin-bottom: 6px; }
      em { color: #555; }
      @media print { body { padding: 24px; } }
    </style>
  </head>
  <body>${htmlBody}</body>
</html>`)
  printWindow.document.close()
  printWindow.focus()
  window.setTimeout(() => {
    printWindow.print()
  }, 300)
}

export function exportLectureNotes(
  lectureTitle: string,
  content: StructuredNotesContent,
  format: 'markdown' | 'pdf',
  subject?: string | null,
): void {
  const markdown = buildNotesMarkdown(lectureTitle, content, subject)
  const safeName = lectureTitle.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'lecture'

  if (format === 'markdown') {
    downloadMarkdownFile(`${safeName}-notes.md`, markdown)
    return
  }

  downloadNotesAsPdf(lectureTitle, markdown)
}
