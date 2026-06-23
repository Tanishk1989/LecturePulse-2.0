import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { submitAiFeedback } from '@/services/aiFeedbackService'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'

interface FeedbackControlsProps {
  contentType: 'summary' | 'flashcard' | 'quiz' | 'quiz_question'
  contentId: string
  lectureId: string
  subject?: string | null
  className?: string
}

export function FeedbackControls({
  contentType,
  contentId,
  lectureId,
  subject,
  className,
}: FeedbackControlsProps) {
  const { toast } = useToast()
  const [selected, setSelected] = useState<'positive' | 'negative' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleFeedback = async (val: 'positive' | 'negative') => {
    if (submitting) return
    const nextVal = selected === val ? null : val // toggle feedback
    
    setSelected(nextVal)
    setSubmitting(true)

    try {
      if (nextVal) {
        await submitAiFeedback({
          contentType,
          contentId,
          lectureId,
          subject,
          feedback: nextVal,
        })
        toast.success('Thank you for your feedback!')
      } else {
        toast.success('Feedback cleared.')
      }
    } catch (err) {
      setSelected(selected) // revert state on failure
      toast.error('Failed to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity duration-200',
        className
      )}
    >
      <button
        type="button"
        disabled={submitting}
        onClick={(e) => {
          e.stopPropagation()
          void handleFeedback('positive')
        }}
        aria-label="Thumbs up"
        className={cn(
          'p-1.5 rounded hover:bg-white/[0.08] cursor-pointer transition-colors',
          selected === 'positive' ? 'text-emerald fill-emerald/20' : 'text-muted hover:text-foreground'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={(e) => {
          e.stopPropagation()
          void handleFeedback('negative')
        }}
        aria-label="Thumbs down"
        className={cn(
          'p-1.5 rounded hover:bg-white/[0.08] cursor-pointer transition-colors',
          selected === 'negative' ? 'text-red fill-red/20' : 'text-muted hover:text-foreground'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
