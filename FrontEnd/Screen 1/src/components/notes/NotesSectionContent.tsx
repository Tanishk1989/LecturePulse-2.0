import type { NoteSectionId, StructuredNotesContent } from '@/types/notes'
import {
  ConceptsSection,
  DefinitionsSection,
  ExamplesSection,
  ExamTipsSection,
  QuestionsSection,
  SummarySection,
} from '@/components/notes/NotesSections'

interface NotesSectionContentProps {
  section: NoteSectionId
  content: StructuredNotesContent
  transcriptText: string | null
  lectureId: string
}

export function NotesSectionContent({
  section,
  content,
  transcriptText,
  lectureId,
}: NotesSectionContentProps) {
  switch (section) {
    case 'summary':
      return <SummarySection summary={content.summary} />
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
      return <DefinitionsSection definitions={content.definitions} />
    case 'examples':
      return <ExamplesSection examples={content.examples} />
    case 'questions':
      return <QuestionsSection questions={content.questions} transcriptText={transcriptText} />
    case 'exam-tips':
      return <ExamTipsSection examTips={content.examTips} />
    default:
      return null
  }
}
