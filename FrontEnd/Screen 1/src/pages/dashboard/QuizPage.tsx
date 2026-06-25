import { useCallback, useEffect, useMemo, useState } from 'react'

import { Brain, Loader2, Play } from 'lucide-react'

import { FadeUp } from '@/components/effects/FadeUp'

import { QuizRunner } from '@/components/quiz/QuizRunner'

import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'

import { useToast } from '@/components/ui/ToastProvider'

import { useAuthContext } from '@/context/AuthContext'

import { useLectures } from '@/hooks/useLectures'

import { generateQuiz, isAiGenerationConfigured, type QuizQuestion } from '@/services/aiGenerationService'

import { getTranscriptByLectureId } from '@/services/transcriptionService'

import { deriveQuizDifficulty, type QuizDifficulty } from '@/lib/quizDifficulty'
import { useI18n } from '@/context/I18nContext'

import {

  getLectureQuizAttempts,

  saveLectureQuizAttempt,

} from '@/services/lectureQuizService'

import { cn } from '@/lib/utils'



export function QuizPage() {

  const { user } = useAuthContext()

  const { toast } = useToast()
  const { translate } = useI18n()

  const { lectures, loading } = useLectures()

  const [lectureId, setLectureId] = useState<string>('')

  const [generating, setGenerating] = useState(false)

  const [quizOpen, setQuizOpen] = useState(false)

  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium')



  const completedLectures = useMemo(

    () => lectures.filter((lecture) => lecture.status === 'completed'),

    [lectures],

  )



  const selectedLecture = useMemo(

    () => completedLectures.find((lecture) => lecture.id === lectureId),

    [completedLectures, lectureId],

  )



  const canGenerate = isAiGenerationConfigured() && Boolean(user) && Boolean(selectedLecture)



  useEffect(() => {

    if (!lectureId) return

    void getLectureQuizAttempts(lectureId)

      .then((attempts) => setDifficulty(deriveQuizDifficulty(attempts)))

      .catch(() => setDifficulty('medium'))

  }, [lectureId])



  const handleStartQuiz = useCallback(async () => {

    if (!user || !selectedLecture) return



    setQuizOpen(true)

    setGenerating(true)

    setQuestions([])



    try {

      const [transcript, attempts] = await Promise.all([

        getTranscriptByLectureId(user.uid, selectedLecture.id),

        getLectureQuizAttempts(selectedLecture.id).catch(() => []),

      ])

      const text = transcript?.fullText ?? ''

      if (!text.trim()) {

        toast.error('No transcript available for this lecture.')

        setQuizOpen(false)

        return

      }



      const nextDifficulty = deriveQuizDifficulty(attempts)

      setDifficulty(nextDifficulty)



      const quiz = await generateQuiz(text, nextDifficulty)

      if (quiz.length === 0) {

        toast.error('Could not generate quiz questions for this lecture.')

        setQuizOpen(false)

        return

      }



      setQuestions(quiz.slice(0, 12))

    } catch (error) {

      toast.error(error instanceof Error ? error.message : 'Quiz generation failed.')

      setQuizOpen(false)

    } finally {

      setGenerating(false)

    }

  }, [selectedLecture, toast, user])



  const handleAnswerChecked = useCallback(

    async (args: {

      question: QuizQuestion

      selectedAnswer: string

      isCorrect: boolean

    }) => {

      if (!selectedLecture) return

      await saveLectureQuizAttempt({

        lectureId: selectedLecture.id,

        question: args.question.question,

        selectedAnswer: args.selectedAnswer,

        correctAnswer: args.question.correctAnswer,

        isCorrect: args.isCorrect,

        difficulty,

      })

    },

    [difficulty, selectedLecture],

  )



  return (

    <DashboardPageShell className="space-y-8">

      <FadeUp>

        <DashboardPageHeader
          title={translate('quiz.title')}
          description={translate('quiz.description')}
        />

      </FadeUp>



      <FadeUp delay={0.06}>

        <div className="max-w-xl rounded-3xl border border-white/[0.08] bg-card/50 p-6 backdrop-blur-xl space-y-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">

              <Brain className="h-5 w-5" />

            </div>

            <div>

              <p className="text-sm font-medium text-foreground">{translate('quiz.chooseLecture')}</p>

              <p className="text-xs text-muted">Only completed lectures with transcripts are available.</p>

            </div>

          </div>



          {loading ? (

            <div className="flex items-center gap-2 text-sm text-muted py-4">

              <Loader2 className="h-4 w-4 animate-spin" />

              Loading lectures…

            </div>

          ) : completedLectures.length === 0 ? (

            <p className="text-sm text-muted">Record or upload a lecture and wait for processing to finish.</p>

          ) : (

            <select

              value={lectureId}

              onChange={(event) => setLectureId(event.target.value)}

              className={cn(

                'w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-foreground',

                'outline-none cursor-pointer focus:border-accent/35',

              )}

            >

              <option value="" className="bg-card">Select a lecture…</option>

              {completedLectures.map((lecture) => (

                <option key={lecture.id} value={lecture.id} className="bg-card">

                  {lecture.title}

                </option>

              ))}

            </select>

          )}



          {lectureId && (

            <p className="text-xs text-muted">

              Adaptive difficulty:{' '}

              <span className="font-medium text-foreground capitalize">{difficulty}</span>

            </p>

          )}



          <button

            type="button"

            disabled={!canGenerate || generating}

            onClick={() => void handleStartQuiz()}

            className={cn(

              'inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background',

              'cursor-pointer hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed',

            )}

          >

            <Play className="h-4 w-4" />

            {translate('quiz.start')}

          </button>

        </div>

      </FadeUp>



      {quizOpen && selectedLecture && (

        <QuizRunner

          title={`Quiz: ${selectedLecture.title}`}

          subtitle={`Full-lecture comprehension · ${difficulty} difficulty`}

          loading={generating}

          questions={questions}

          onClose={() => setQuizOpen(false)}

          onAnswerChecked={handleAnswerChecked}

        />

      )}

    </DashboardPageShell>

  )

}

