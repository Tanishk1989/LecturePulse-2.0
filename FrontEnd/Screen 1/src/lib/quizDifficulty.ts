export type QuizDifficulty = 'easy' | 'medium' | 'hard'

export function deriveQuizDifficulty(
  attempts: Array<{ isCorrect: boolean }>,
): QuizDifficulty {
  if (attempts.length === 0) return 'medium'

  const recent = attempts.slice(0, 10)
  const accuracy = recent.filter((attempt) => attempt.isCorrect).length / recent.length

  if (accuracy >= 0.8) return 'hard'
  if (accuracy <= 0.45) return 'easy'
  return 'medium'
}

export function quizDifficultyPrompt(difficulty: QuizDifficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'Generate foundational questions testing basic recall and definitions. Use straightforward language.'
    case 'hard':
      return 'Generate challenging application and analysis questions. Include subtle distractors and scenario-based problems.'
    default:
      return 'Generate balanced comprehension questions at an intermediate university level.'
  }
}
