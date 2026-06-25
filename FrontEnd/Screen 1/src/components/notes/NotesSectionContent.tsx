import type { NoteSectionId, StructuredNotesContent } from '@/types/notes'
import {
  ConceptsSection,
  DefinitionsSection,
  ExamTipsSection,
  QuestionsSection,
  SummarySection,
} from '@/components/notes/NotesSections'
import { MindMapSection } from '@/components/notes/MindMapSection'
import { FlashcardsTab } from '@/components/notes/FlashcardsTab'
import { AskAIPanelPrompt } from '@/components/notes/AskAIPanelPrompt'

interface NotesSectionContentProps {
  section: NoteSectionId
  content: StructuredNotesContent
  transcriptText: string | null
  lectureId: string
  lectureTitle: string
  subject?: string | null
}

export function NotesSectionContent({
  section,
  content,
  transcriptText,
  lectureId,
  lectureTitle,
  subject,
}: NotesSectionContentProps) {
  switch (section) {
    case 'summary':
      return <SummarySection summary={content.summary} lectureId={lectureId} subject={subject} />
    case 'concepts':
      return (
        <ConceptsSection
          concepts={content.keyConcepts}
          importantPoints={content.importantPoints}
          transcriptText={transcriptText}
          lectureId={lectureId}
        />
      )
    case 'definitions':
      return (
        <DefinitionsSection
          definitions={content.definitions}
          lectureId={lectureId}
          transcriptText={transcriptText}
        />
      )
    case 'mind-map':
      return (
        <MindMapSection
          mindMap={content.mindMap ?? null}
          lectureTitle={lectureTitle}
          content={content}
        />
      )
    case 'questions':
      return (
        <QuestionsSection
          questions={content.questions}
          transcriptText={transcriptText}
          lectureId={lectureId}
          subject={subject}
        />
      )
    case 'exam-tips':
      return <ExamTipsSection examTips={content.examTips} lectureId={lectureId} />
    case 'flashcards':
      return <FlashcardsTab lectureId={lectureId} transcriptText={transcriptText} subject={subject} />
    case 'ask-ai':
      return <AskAIPanelPrompt />
    default:
      return null
  }
}
