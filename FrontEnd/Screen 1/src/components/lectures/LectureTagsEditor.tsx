import { useState, type KeyboardEvent } from 'react'
import { Plus, Tag, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LectureTagsEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  className?: string
  compact?: boolean
}

export function LectureTagsEditor({ tags, onChange, className, compact }: LectureTagsEditorProps) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)

  const addTag = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    const normalized = trimmed.replace(/\s+/g, ' ')
    if (tags.some((tag) => tag.toLowerCase() === normalized.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...tags, normalized].slice(0, 20))
    setDraft('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((item) => item !== tag))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
    if (event.key === 'Escape') {
      setEditing(false)
      setDraft('')
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted',
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
          )}
        >
          <Tag className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          {tag}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              removeTag(tag)
            }}
            className="ml-0.5 text-muted hover:text-foreground cursor-pointer"
            aria-label={`Remove tag ${tag}`}
          >
            <X className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          </button>
        </span>
      ))}

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (draft.trim()) addTag()
            setEditing(false)
            setDraft('')
          }}
          placeholder="Add tag…"
          className={cn(
            'rounded-full border border-accent/25 bg-white/[0.03] px-3 py-1 text-xs text-foreground outline-none',
            compact ? 'w-24' : 'w-32',
          )}
        />
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setEditing(true)
          }}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-dashed border-white/[0.12] text-muted',
            'hover:border-accent/25 hover:text-accent cursor-pointer transition-colors',
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
          )}
        >
          <Plus className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          Tag
        </button>
      )}
    </div>
  )
}
