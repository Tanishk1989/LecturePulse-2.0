import React, { useMemo } from 'react'
import {
  Lightbulb,
  Star,
  Flag,
  AlertTriangle,
  Sparkles,
  BookOpen,
  Brain,
  HelpCircle,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarkdownBlock {
  type: 'heading' | 'list' | 'paragraph' | 'hr'
  level?: number
  listType?: 'unordered' | 'ordered'
  items?: string[]
  text?: string
}

interface MarkdownSection {
  headingBlock: MarkdownBlock | null
  blocks: MarkdownBlock[]
}

// Inline formatting parser
export function renderInlineText(text: string, showCursor?: boolean): React.ReactNode {
  const parts: React.ReactNode[] = []
  let key = 0

  // Matches bold **text**, *italic*, `code`, and the [unclear from audio] tag
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[unclear from audio\])/g
  const tokens = text.split(regex)

  for (const token of tokens) {
    if (token === '[unclear from audio]') {
      parts.push(
        <span
          key={key++}
          title="This part of the transcript was unclear — please verify against your original recording."
          className="inline-flex items-center gap-1 select-none text-amber-500/90 border-b border-dashed border-amber-500 cursor-help font-medium ml-1"
        >
          <AlertCircle className="h-3.5 w-3.5 inline shrink-0" />
          <span className="text-[11px] leading-none">unclear</span>
        </span>
      )
    } else if (token.startsWith('**') && token.endsWith('**')) {
      const boldText = token.slice(2, -2)
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {boldText}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const italicText = token.slice(1, -1)
      parts.push(
        <em key={key++} className="italic text-foreground/90">
          {italicText}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeText = token.slice(1, -1)
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-accent text-xs font-mono">
          {codeText}
        </code>
      )
    } else {
      parts.push(token)
    }
  }

  if (showCursor) {
    parts.push(
      <span
        key="cursor"
        className="inline-block w-[1.5px] h-[1.15em] ml-1 bg-accent/80 animate-pulse align-middle"
      />
    )
  }

  return <>{parts}</>
}

// Parse markdown text into blocks
function parseMarkdown(text: string): MarkdownBlock[] {
  const lines = text.split('\n')
  const blocks: MarkdownBlock[] = []
  
  let currentParagraph: string[] = []
  let currentList: { type: 'unordered' | 'ordered'; items: string[] } | null = null

  const flush = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join(' ')
      })
      currentParagraph = []
    }
    if (currentList) {
      blocks.push({
        type: 'list',
        listType: currentList.type,
        items: currentList.items
      })
      currentList = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flush()
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flush()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim()
      })
      continue
    }

    // HR
    if (trimmed === '---' || trimmed === '***') {
      flush()
      blocks.push({ type: 'hr' })
      continue
    }

    // Unordered list
    const uListMatch = line.match(/^[\s]*[-*]\s+(.*)$/)
    if (uListMatch) {
      if (currentParagraph.length > 0) {
        flush()
      }
      if (currentList && currentList.type === 'unordered') {
        currentList.items.push(uListMatch[1].trim())
      } else {
        flush()
        currentList = {
          type: 'unordered',
          items: [uListMatch[1].trim()]
        }
      }
      continue
    }

    // Ordered list
    const oListMatch = line.match(/^[\s]*\d+\.\s+(.*)$/)
    if (oListMatch) {
      if (currentParagraph.length > 0) {
        flush()
      }
      if (currentList && currentList.type === 'ordered') {
        currentList.items.push(oListMatch[1].trim())
      } else {
        flush()
        currentList = {
          type: 'ordered',
          items: [oListMatch[1].trim()]
        }
      }
      continue
    }

    // Regular text
    if (currentList) {
      flush()
    }
    currentParagraph.push(trimmed)
  }

  flush()
  return blocks
}

// Group blocks into sections by Level 3 headings
function groupIntoSections(blocks: MarkdownBlock[]): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  let currentSection: MarkdownSection = { headingBlock: null, blocks: [] }

  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 3) {
      if (currentSection.headingBlock || currentSection.blocks.length > 0) {
        sections.push(currentSection)
      }
      currentSection = { headingBlock: block, blocks: [] }
    } else {
      currentSection.blocks.push(block)
    }
  }

  if (currentSection.headingBlock || currentSection.blocks.length > 0) {
    sections.push(currentSection)
  }

  return sections
}

function getSectionIcon(heading: string) {
  const lower = heading.toLowerCase()
  if (lower.includes('summary') || lower.includes('theme')) {
    return Lightbulb
  }
  if (lower.includes('takeaway') || lower.includes('key')) {
    return Star
  }
  if (
    lower.includes('next') ||
    lower.includes('step') ||
    lower.includes('action') ||
    lower.includes('warning') ||
    lower.includes('pitfall') ||
    lower.includes('mistake')
  ) {
    return Flag
  }
  if (lower.includes('definition')) {
    return BookOpen
  }
  if (lower.includes('concept')) {
    return Brain
  }
  if (lower.includes('question')) {
    return HelpCircle
  }
  return Sparkles
}

interface MarkdownRendererProps {
  content: string
  showCursor?: boolean
  className?: string
}

export function MarkdownRenderer({ content, showCursor, className }: MarkdownRendererProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content])
  const sections = useMemo(() => groupIntoSections(blocks), [blocks])

  const renderBlock = (block: MarkdownBlock, index: number, isLastInDocument: boolean) => {
    const isLast = isLastInDocument
    const currentCursor = showCursor && isLast

    switch (block.type) {
      case 'heading': {
        const HeadingTag = `h${block.level}` as any
        const sizeClasses =
          block.level === 1
            ? 'text-xl font-bold'
            : block.level === 2
            ? 'text-lg font-semibold'
            : 'text-base font-semibold'
        return (
          <HeadingTag
            key={index}
            className={cn('text-foreground mt-4 mb-2', sizeClasses)}
          >
            {renderInlineText(block.text || '', currentCursor)}
          </HeadingTag>
        )
      }
      case 'hr':
        return <hr key={index} className="border-t-[0.5px] border-white/10 my-4" />
      case 'list': {
        const Tag = block.listType === 'ordered' ? 'ol' : 'ul'
        return (
          <Tag key={index} className="space-y-2.5 my-3">
            {block.items?.map((item, itemIdx) => {
              const isLastItem = isLast && itemIdx === (block.items!.length - 1)
              return (
                <li
                  key={itemIdx}
                  className="flex gap-2.5 leading-[1.75] text-[14px] text-foreground/70"
                >
                  {block.listType === 'ordered' ? (
                    <span className="text-accent/80 font-medium select-none min-w-[14px]">
                      {itemIdx + 1}.
                    </span>
                  ) : (
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent/80" />
                  )}
                  <span>
                    {renderInlineText(item, currentCursor && isLastItem)}
                  </span>
                </li>
              )
            })}
          </Tag>
        )
      }
      case 'paragraph':
      default:
        return (
          <p
            key={index}
            className="text-[14px] leading-[1.75] text-foreground/80 my-3"
          >
            {renderInlineText(block.text || '', currentCursor)}
          </p>
        )
    }
  }

  return (
    <div className={cn('space-y-6', className)}>
      {sections.map((section, secIdx) => {
        const isLastSection = secIdx === sections.length - 1
        const hasHeading = !!section.headingBlock
        const headingText = section.headingBlock?.text || ''
        const Icon = getSectionIcon(headingText)

        // Check if next steps or warning type
        const lowerHeading = headingText.toLowerCase()
        const isWarningCallout =
          lowerHeading.includes('next') ||
          lowerHeading.includes('step') ||
          lowerHeading.includes('action') ||
          lowerHeading.includes('warning') ||
          lowerHeading.includes('pitfall') ||
          lowerHeading.includes('mistake')

        const sectionContent = (
          <div className="space-y-1">
            {section.blocks.map((block, blockIdx) => {
              const isLastBlock = isLastSection && blockIdx === section.blocks.length - 1
              return renderBlock(block, blockIdx, isLastBlock)
            })}
          </div>
        )

        return (
          <div key={secIdx}>
            {secIdx > 0 && <hr className="border-t-[0.5px] border-white/10 my-6" />}
            {hasHeading ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {headingText}
                  </h3>
                </div>
                <div className="pl-[34px] mt-2">
                  {isWarningCallout ? (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200/90">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-1" />
                      <div className="flex-1 text-sm text-amber-200/80 leading-relaxed">
                        {sectionContent}
                      </div>
                    </div>
                  ) : (
                    sectionContent
                  )}
                </div>
              </div>
            ) : (
              sectionContent
            )}
          </div>
        )
      })}
    </div>
  )
}
