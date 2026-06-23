export type NotesStatus = 'idle' | 'generating' | 'completed' | 'failed'

export type NoteSectionId =
  | 'summary'
  | 'concepts'
  | 'definitions'
  | 'mind-map'
  | 'questions'
  | 'exam-tips'
  | 'flashcards'
  | 'ask-ai'

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

export interface MindMapNode {
  id: string
  label: string
  parentId: string | null
  level: number
  elaboration?: string
}

export interface MindMapData {
  root: { id: string; label: string }
  nodes: MindMapNode[]
}

export interface StructuredNotesContent {
  summary: string
  keyConcepts: KeyConcept[]
  importantPoints: string[]
  definitions: Definition[]
  examples?: NoteExample[]
  mindMap?: MindMapData | null
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
  examples?: NoteExample[]
  mind_map?: MindMapData | null
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
  { id: 'concepts', label: 'Notes' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'mind-map', label: 'Mind Map' },
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
    mindMap: null,
    questions: [],
    examTips: EMPTY_EXAM_TIPS,
  }
}

export function mapRowToNotes(row: LectureNotesRow): LectureNotes {
  const record = row as LectureNotesRow & {
    lectureId?: string
    userId?: string
    keyConcepts?: KeyConcept[]
    importantPoints?: string[]
    mindMap?: MindMapData | null
    examTips?: ExamTips
    errorMessage?: string | null
    createdAt?: string
    updatedAt?: string
  }

  const examTips = row.exam_tips ?? record.examTips ?? EMPTY_EXAM_TIPS

  return {
    id: row.id,
    lectureId: row.lecture_id ?? record.lectureId ?? '',
    userId: row.user_id ?? record.userId ?? '',
    content: {
      summary: row.summary ?? '',
      keyConcepts: Array.isArray(row.key_concepts)
        ? row.key_concepts
        : (record.keyConcepts ?? []),
      importantPoints: Array.isArray(row.important_points)
        ? row.important_points
        : (record.importantPoints ?? []),
      definitions: Array.isArray(row.definitions) ? row.definitions : [],
      examples: Array.isArray(row.examples) ? row.examples : [],
      mindMap: row.mind_map ?? record.mindMap ?? null,
      questions: Array.isArray(row.questions) ? row.questions : [],
      examTips: {
        mostImportant: Array.isArray(examTips.mostImportant) ? examTips.mostImportant : [],
        commonMistakes: Array.isArray(examTips.commonMistakes) ? examTips.commonMistakes : [],
        topicsToRevise: Array.isArray(examTips.topicsToRevise) ? examTips.topicsToRevise : [],
      },
    },
    status: row.status,
    errorMessage: row.error_message ?? record.errorMessage ?? null,
    createdAt: row.created_at ?? record.createdAt ?? '',
    updatedAt: row.updated_at ?? record.updatedAt ?? '',
  }
}
