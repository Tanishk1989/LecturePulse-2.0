import { groqChatCompletion } from './groq'

export type SpeakerRole = 'professor' | 'student' | 'unknown'

export interface SegmentInput {
  id: number
  start: number
  end: number
  text: string
  speaker?: SpeakerRole
  voiceCluster?: number
}

export interface LabeledSegment extends SegmentInput {
  speaker: SpeakerRole
}

const BATCH_SIZE = 40

function parseSpeakerRole(value: unknown): SpeakerRole {
  if (value === 'professor' || value === 'student' || value === 'unknown') {
    return value
  }
  return 'unknown'
}

function classifySegmentHeuristic(text: string): SpeakerRole {
  const trimmed = text.trim()
  if (!trimmed) return 'unknown'

  const lower = trimmed.toLowerCase()

  const studentSignals = [
    /^(excuse me|sir|professor|teacher|ma'am|madam)\b/,
    /^(can you|could you|would you|what about|how about|i have a question)\b/,
    /^(why|how|what|when|where|is it true|does that mean)\b.{0,120}\?$/,
    /\?$/,
    /^(yes|no|okay|right|sure)\?$/,
    /^(sorry|wait|hang on|one more thing)\b/,
  ]

  const professorSignals = [
    /^(so|now|today|let's|we will|remember|note that|the key point|definition|therefore|thus|in summary)\b/,
    /^(first|second|third|next|finally|moving on)\b/,
  ]

  if (trimmed.length <= 90 && studentSignals.some((pattern) => pattern.test(lower))) {
    return 'student'
  }

  if (trimmed.length >= 120 && professorSignals.some((pattern) => pattern.test(lower))) {
    return 'professor'
  }

  if (trimmed.length >= 200) return 'professor'
  if (trimmed.length <= 50 && lower.includes('?')) return 'student'

  return 'unknown'
}

function applyHeuristicLabels(segments: SegmentInput[]): LabeledSegment[] {
  return segments.map((segment) => ({
    ...segment,
    speaker: segment.speaker ?? classifySegmentHeuristic(segment.text),
  }))
}

function mergeVoiceClusters(segments: SegmentInput[]): SegmentInput[] {
  const clusters = segments.map((s) => s.voiceCluster).filter((c) => c === 0 || c === 1)
  if (clusters.length < 4) return segments

  const durationByCluster: Record<number, number> = { 0: 0, 1: 0 }
  for (const segment of segments) {
    if (segment.voiceCluster === 0 || segment.voiceCluster === 1) {
      durationByCluster[segment.voiceCluster] += Math.max(0, segment.end - segment.start)
    }
  }

  const professorCluster = durationByCluster[0] >= durationByCluster[1] ? 0 : 1

  return segments.map((segment) => {
    if (segment.voiceCluster !== 0 && segment.voiceCluster !== 1) return segment
    const voiceSpeaker: SpeakerRole =
      segment.voiceCluster === professorCluster ? 'professor' : 'student'
    return {
      ...segment,
      speaker: segment.speaker && segment.speaker !== 'unknown' ? segment.speaker : voiceSpeaker,
    }
  })
}

async function labelBatchWithLlm(
  segments: SegmentInput[],
  subject?: string,
): Promise<Map<number, SpeakerRole>> {
  const labelMap = new Map<number, SpeakerRole>()
  if (segments.length === 0) return labelMap

  const segmentLines = segments
    .map((s) => `[${s.id}] (${s.start.toFixed(1)}s-${s.end.toFixed(1)}s): ${s.text}`)
    .join('\n')

  const systemPrompt = `You classify speakers in a university lecture transcript.
Assign each segment one role:
- professor: lecturer teaching, explaining, defining, giving examples
- student: questions, short clarifications, interjections, "can you explain", "what about"
- unknown: unclear, noise, or non-speech artifacts

${subject ? `Subject context: ${subject}` : ''}

Return ONLY valid JSON:
{"labels":[{"id":0,"speaker":"professor"}]}

Use only professor, student, or unknown. Every segment id must appear exactly once.`

  const userPrompt = `Classify each segment:\n\n${segmentLines}`

  try {
    const raw = await groqChatCompletion(systemPrompt, userPrompt, {
      temperature: 0.1,
      jsonMode: true,
    })
    const parsed = JSON.parse(raw) as { labels?: Array<{ id?: number; speaker?: string }> }
    for (const item of parsed.labels ?? []) {
      if (typeof item.id === 'number') {
        labelMap.set(item.id, parseSpeakerRole(item.speaker))
      }
    }
  } catch (error) {
    console.error('[SpeakerDetection] LLM batch failed:', error)
  }

  return labelMap
}

export async function detectSpeakersInSegments(
  segments: SegmentInput[],
  options?: { subject?: string; useLlm?: boolean },
): Promise<LabeledSegment[]> {
  if (segments.length === 0) return []

  const useLlm = options?.useLlm !== false
  let working = mergeVoiceClusters(segments.map((s) => ({ ...s })))

  if (!useLlm) {
    return applyHeuristicLabels(working)
  }

  const heuristic = applyHeuristicLabels(working)
  const unknownSegments = heuristic.filter((s) => s.speaker === 'unknown')

  if (unknownSegments.length === 0) {
    return heuristic
  }

  for (let i = 0; i < unknownSegments.length; i += BATCH_SIZE) {
    const batch = unknownSegments.slice(i, i + BATCH_SIZE)
    const llmLabels = await labelBatchWithLlm(batch, options?.subject)

    working = working.map((segment) => {
      const llmSpeaker = llmLabels.get(segment.id)
      if (!llmSpeaker) return segment
      const current = heuristic.find((h) => h.id === segment.id)?.speaker
      if (current && current !== 'unknown') {
        return { ...segment, speaker: current }
      }
      return { ...segment, speaker: llmSpeaker }
    })
  }

  return applyHeuristicLabels(working).map((segment) => ({
    ...segment,
    speaker:
      segment.speaker !== 'unknown'
        ? segment.speaker
        : (working.find((s) => s.id === segment.id)?.speaker ?? 'unknown'),
  }))
}
