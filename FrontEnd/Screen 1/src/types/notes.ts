export type NotesStatus = 'idle' | 'generating' | 'completed' | 'failed'

export type NoteSectionId =
  | 'summary'
  | 'concepts'
  | 'definitions'
  | 'examples'
  | 'questions'
  | 'exam-tips'

export interface KeyConcept {
  title: string
  explanation: string
  importance: string
}

export interface Definition {
  term: string
  definition: string
  example: string
}

export interface NoteExample {
  title: string
  description: string
  context: string
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface StudyQuestion {
  difficulty: QuestionDifficulty
  question: string
  answer: string
}

export interface ExamTips {
  mostImportant: string[]
  commonMistakes: string[]
  topicsToRevise: string[]
}

export interface StructuredNotesContent {
  summary: string
  keyConcepts: KeyConcept[]
  importantPoints: string[]
  definitions: Definition[]
  examples: NoteExample[]
  questions: StudyQuestion[]
  examTips: ExamTips
}

export interface LectureNotesRow {
  id: string
  lecture_id: string
  user_id: string
  summary: string
  key_concepts: KeyConcept[]
  important_points: string[]
  definitions: Definition[]
  examples: NoteExample[]
  questions: StudyQuestion[]
  exam_tips: ExamTips
  status: NotesStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface LectureNotes {
  id: string
  lectureId: string
  userId: string
  content: StructuredNotesContent
  status: NotesStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateNotesInput {
  lectureId: string
  userId: string
  content?: Partial<StructuredNotesContent>
  status?: NotesStatus
  errorMessage?: string | null
}

export const NOTE_SECTIONS: { id: NoteSectionId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'concepts', label: 'Concepts' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'examples', label: 'Examples' },
  { id: 'questions', label: 'Questions' },
  { id: 'exam-tips', label: 'Exam Tips' },
]

const EMPTY_EXAM_TIPS: ExamTips = {
  mostImportant: [],
  commonMistakes: [],
  topicsToRevise: [],
}

export function emptyStructuredNotes(): StructuredNotesContent {
  return {
    summary: '',
    keyConcepts: [],
    importantPoints: [],
    definitions: [],
    examples: [],
    questions: [],
    examTips: EMPTY_EXAM_TIPS,
  }
}

export function mapRowToNotes(row: LectureNotesRow): LectureNotes {
  const examTips = row.exam_tips ?? EMPTY_EXAM_TIPS
  return {
    id: row.id,
    lectureId: row.lecture_id,
    userId: row.user_id,
    content: {
      summary: row.summary ?? '',
      keyConcepts: Array.isArray(row.key_concepts) ? row.key_concepts : [],
      importantPoints: Array.isArray(row.important_points) ? row.important_points : [],
      definitions: Array.isArray(row.definitions) ? row.definitions : [],
      examples: Array.isArray(row.examples) ? row.examples : [],
      questions: Array.isArray(row.questions) ? row.questions : [],
      examTips: {
        mostImportant: Array.isArray(examTips.mostImportant) ? examTips.mostImportant : [],
        commonMistakes: Array.isArray(examTips.commonMistakes) ? examTips.commonMistakes : [],
        topicsToRevise: Array.isArray(examTips.topicsToRevise) ? examTips.topicsToRevise : [],
      },
    },
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
