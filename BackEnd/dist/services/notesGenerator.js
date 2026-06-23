"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTES_SYSTEM_PROMPT = void 0;
exports.generateStructuredNotes = generateStructuredNotes;
const groq_1 = require("./groq");
const parseJsonFromAi_1 = require("../utils/parseJsonFromAi");
const db_1 = require("../config/db");
exports.NOTES_SYSTEM_PROMPT = `You are LecturePulse's Elite Academic Note-Taker. Your role is to convert a lecture transcript into highly structured, premium study notes.

Language Rule: All AI-generated content — summary, key concepts, definitions, mindMap, questions, examTips — must always be in English, regardless of what language the lecture or transcript is in. Even if the transcript is in Hinglish or Hindi, you must always generate all these notes/sections in English. Do NOT translate or write notes in Hindi or Hinglish.

Return ONLY a valid JSON object matching the exact schema below. Do not wrap the JSON in markdown code blocks or add any other text.

JSON Schema:
{
  "summary": "string - An elegant, high-yield overview of the lecture. You MUST format this string into exactly three sections separated by \\n\\n, using these exact headings:\n### Summary\n[2-3 sentence overview in English]\n\n### Key Topics\n1. **[Topic Title 1]**: [Short paragraph body explaining the subtopic in English]\n2. **[Topic Title 2]**: [Short paragraph body explaining the subtopic in English]\n...\n\n### Key Takeaways\n- [ ] [Takeaway 1 in English]\n- [ ] [Takeaway 2 in English]\n...",
  "keyConcepts": [
    {
      "title": "string - Clear, concise academic title.",
      "explanation": "string - Step-by-step breakdown using the Feynman Technique (explain as if teaching a beginner). Use relatable analogies and simple language. Fold any real-world examples directly into this explanation. Keep formatting clean with lists/code snippets if applicable.",
      "importance": "string - A brief sentence on why this concept is fundamental."
    }
  ],
  "importantPoints": [
    "string - A high-yield point capturing a formula, step, or crucial fact. Always format as '**Label** — Explanation' (e.g., '**Introduction to the lecture** — starts with...')."
  ],
  "definitions": [
    {
      "term": "string - Technical term or jargon.",
      "definition": "string - Precise, clear definition.",
      "example": "string - Contextual example showing the term in use."
    }
  ],
  "mindMap": {
    "root": { "id": "root", "label": "string - The main topic of the lecture" },
    "nodes": [
      {
        "id": "string - Unique node ID (e.g., 'branch-1', 'sub-1-1')",
        "label": "string - Concise node label (2-4 words)",
        "parentId": "string|null - ID of parent node ('root' or parent branch ID)",
        "level": 1|2,
        "elaboration": "string - Brief 1-line explanation/detail on this concept (used as hover tooltip)"
      }
    ]
  },
  "questions": [
    {
      "difficulty": "easy|medium|hard",
      "question": "string - Thought-provoking active recall question.",
      "answer": "string - Comprehensive, well-explained solution. Include steps or reasoning."
    }
  ],
  "examTips": {
    "mostImportant": [
      "string - High-yield focus area for exam preparation. Always format as '**Label** — Explanation'."
    ],
    "commonMistakes": [
      "string - Conceptual pitfall, common misinterpretation, or calculation error. Always format as '**Label** — Explanation'."
    ],
    "topicsToRevise": [
      "string - Prerequisite or key term that is critical to master for future lectures. Always format as '**Label** — Explanation'."
    ]
  }
}

Constraints & Rules:
1. Grounding: Rely ONLY on the facts present in the transcript. Do not assume, extrapolate, or invent topics not discussed.
2. Structure Quantities: Generate 4-8 key concepts, 6-12 important points, 3-6 definitions, 6-9 questions (exactly 2 easy, 2-3 medium, 2-4 hard), and 3-5 items for each examTips category.
3. Mind Map Hierarchy: Prioritize a clear, logical hierarchy that reflects how a student would actually organize the topic for revision, not just a flat list of mentioned terms. The AI should infer meaningful groupings/themes rather than node-per-sentence extraction. Generate exactly 1 root node, 3-6 branch nodes (level 1), and 2-4 sub-nodes (level 2) connected to each branch node.
4. Exam Tips Limit: Do NOT predict marks, grades, or percentages.
5. Output JSON: Do not include markdown code block fences (like \`\`\`json) or any commentary. Output only the pure JSON string.
6. Confidence Flagging: If any part of the source transcript is ambiguous, unclear, or could be a transcription error (e.g. a term that doesn't make sense in context, a number that seems inconsistent, or a sentence that's hard to interpret), do NOT guess or assume what was meant. Instead, mark that specific piece of content with the tag [unclear from audio] right after it. Never present uncertain or inferred information as a confirmed fact.`;
function normalizeNotes(parsed) {
    const defaultMindMap = {
        root: { id: 'root', label: 'Main Topic' },
        nodes: [],
    };
    return {
        summary: parsed.summary?.trim() ?? '',
        keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
        importantPoints: Array.isArray(parsed.importantPoints) ? parsed.importantPoints : [],
        definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
        mindMap: parsed.mindMap && typeof parsed.mindMap === 'object' && parsed.mindMap.root
            ? parsed.mindMap
            : defaultMindMap,
        questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        examTips: {
            mostImportant: parsed.examTips?.mostImportant ?? [],
            commonMistakes: parsed.examTips?.commonMistakes ?? [],
            topicsToRevise: parsed.examTips?.topicsToRevise ?? [],
        },
    };
}
async function chunkTranscriptIfLongBackend(transcript) {
    const words = transcript.trim().split(/\s+/);
    if (words.length <= 3500) {
        return [transcript];
    }
    const systemPrompt = `You are a lecture assistant. Analyze this transcript and identify 2-5 natural topic-based section breaks. For each section break, identify the exact sentence that starts the new topic. Return ONLY a valid JSON array of these starting sentences. Do not wrap in markdown or write other text.`;
    try {
        const raw = await (0, groq_1.groqChatCompletion)(systemPrompt, `Transcript:\n${transcript}`);
        let cleaned = raw.trim();
        const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced) {
            cleaned = fenced[1].trim();
        }
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const boundaries = parsed
                .map((sentence) => ({ sentence, index: transcript.indexOf(sentence) }))
                .filter((item) => item.index !== -1)
                .sort((a, b) => a.index - b.index);
            if (boundaries.length > 0) {
                const sections = [];
                for (let i = 0; i < boundaries.length; i++) {
                    const start = boundaries[i].index;
                    const end = i < boundaries.length - 1 ? boundaries[i + 1].index : transcript.length;
                    sections.push(transcript.substring(start, end).trim());
                }
                return sections;
            }
        }
    }
    catch (err) {
        console.error('Failed to split transcript on backend, falling back to word limit:', err);
    }
    const chunks = [];
    const chunkSize = 2000;
    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks;
}
async function generateNotesForChunk(chunk, summaryInstruction = '', difficultyInstruction = '') {
    const userPrompt = `Generate smart study notes from this lecture:\n\n${chunk}`;
    const systemPrompt = exports.NOTES_SYSTEM_PROMPT + summaryInstruction + difficultyInstruction;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const raw = await (0, groq_1.groqChatCompletion)(systemPrompt, userPrompt, {
            jsonMode: true,
            temperature: attempt === 0 ? 0.2 : 0.1,
        });
        const parsed = (0, parseJsonFromAi_1.parseJsonFromAi)(raw);
        if (parsed) {
            return normalizeNotes(parsed);
        }
    }
    throw new Error('AI returned invalid notes format.');
}
async function mergeStructuredNotes(notesList, summaryInstruction = '') {
    // 1. Concatenate all summaries and merge via AI
    const combinedSummaries = notesList.map((n) => n.summary).join('\n\n');
    const mergeSummaryPrompt = `You are an academic note-taking assistant. You are given summaries of different sections of a lecture. Merge them into a single cohesive, structured summary. Remove any redundancy between sections.
You MUST format your output beautifully in Markdown using this exact structure (use the exact '###' headings):
### Summary
[2-3 sentence overview in English]

### Key Topics
1. **[Topic Title 1]**: [Short paragraph body explaining the subtopic in English]
2. **[Topic Title 2]**: [Short paragraph body explaining the subtopic in English]
...

### Key Takeaways
- [ ] [Takeaway 1 in English]
- [ ] [Takeaway 2 in English]
...

Language Rule: All AI-generated content must always be in English, regardless of the language of the source summaries. Do NOT respond in Hindi or Hinglish.
${summaryInstruction}`;
    const mergedSummary = await (0, groq_1.groqChatCompletion)(mergeSummaryPrompt, `Here are the summaries of each section:\n\n${combinedSummaries}`, { temperature: 0.3 });
    // 2. Combine lists
    const keyConcepts = notesList.flatMap((n) => n.keyConcepts);
    const importantPoints = notesList.flatMap((n) => n.importantPoints);
    const definitions = notesList.flatMap((n) => n.definitions);
    const examples = notesList.flatMap((n) => n.examples || []);
    const questions = notesList.flatMap((n) => n.questions);
    const examTips = {
        mostImportant: notesList.flatMap((n) => n.examTips?.mostImportant || []),
        commonMistakes: notesList.flatMap((n) => n.examTips?.commonMistakes || []),
        topicsToRevise: notesList.flatMap((n) => n.examTips?.topicsToRevise || []),
    };
    // 3. Merge Mind Map nodes safely
    const mindMapNodes = [];
    const rootLabel = notesList[0]?.mindMap?.root?.label || 'Lecture Mind Map';
    notesList.forEach((n, secIdx) => {
        if (!n.mindMap || !Array.isArray(n.mindMap.nodes))
            return;
        n.mindMap.nodes.forEach((node) => {
            const parentId = node.parentId === 'root' || node.parentId === null
                ? 'root'
                : `sec_${secIdx}_${node.parentId}`;
            mindMapNodes.push({
                id: `sec_${secIdx}_${node.id}`,
                label: node.label,
                parentId,
                level: node.level,
                elaboration: node.elaboration,
            });
        });
    });
    return {
        summary: mergedSummary.trim(),
        keyConcepts,
        importantPoints,
        definitions,
        examples,
        mindMap: {
            root: { id: 'root', label: rootLabel },
            nodes: mindMapNodes,
        },
        questions,
        examTips,
    };
}
async function generateStructuredNotes(transcript, userId) {
    const trimmed = transcript.trim();
    if (!trimmed) {
        throw new Error('No lecture content available to generate notes.');
    }
    let summaryInstruction = '';
    let difficultyInstruction = '';
    if (userId) {
        try {
            const profile = await db_1.prisma.userProfile.findUnique({
                where: { userId },
            });
            if (profile) {
                if (profile.summaryLength === 'brief') {
                    summaryInstruction = '\n\nFormat guidelines: Provide brief, concise summaries. Keep sections and paragraphs short.';
                }
                else if (profile.summaryLength === 'detailed') {
                    summaryInstruction = '\n\nFormat guidelines: Provide highly detailed, comprehensive summaries explaining the sub-topics thoroughly.';
                }
                if (profile.flashcardDifficulty === 'easy') {
                    difficultyInstruction = '\n\nDifficulty guidelines: Target beginner/easy level for key concepts, definitions, and questions.';
                }
                else if (profile.flashcardDifficulty === 'hard') {
                    difficultyInstruction = '\n\nDifficulty guidelines: Target advanced/challenging level for key concepts, definitions, and questions.';
                }
            }
        }
        catch (err) {
            console.error('Failed to load user profile in notes generator:', err);
        }
    }
    const chunks = await chunkTranscriptIfLongBackend(trimmed);
    if (chunks.length === 1) {
        return generateNotesForChunk(chunks[0], summaryInstruction, difficultyInstruction);
    }
    // Generate per-section notes
    const notesList = [];
    for (const chunk of chunks) {
        const notes = await generateNotesForChunk(chunk, summaryInstruction, difficultyInstruction);
        notesList.push(notes);
    }
    // Merge the per-section outputs
    return mergeStructuredNotes(notesList, summaryInstruction);
}
