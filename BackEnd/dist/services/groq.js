"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroqClient = getGroqClient;
exports.enhanceSystemPrompt = enhanceSystemPrompt;
exports.groqChatCompletion = groqChatCompletion;
exports.groqTranscribeBuffer = groqTranscribeBuffer;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const node_buffer_1 = require("node:buffer");
function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not configured.');
    }
    return new groq_sdk_1.default({ apiKey });
}
function enhanceSystemPrompt(systemPrompt) {
    const centralInstruction = `You are an AI study assistant for LecturePulse. 
The user's lecture may be in Hindi. Follow these rules strictly:

1. Transcript: If the lecture is in Hindi, write the transcript 
   in Hinglish (Hindi spoken words written in Roman/Latin script). 
   Do NOT translate to English. Do NOT use Devanagari script.

2. All other outputs (summary, notes, definitions, mind map, 
   key takeaways, questions, exam tips, flashcards, answers): 
   Always write in English only, regardless of the lecture language.

Never mix these up. Transcript = Hinglish. Everything else = English.`;
    if (systemPrompt.includes('AI study assistant for LecturePulse') && systemPrompt.includes('Transcript = Hinglish')) {
        return systemPrompt;
    }
    return `${centralInstruction}\n\n${systemPrompt}`;
}
async function groqChatCompletion(systemPrompt, userPrompt, options) {
    const enhancedPrompt = enhanceSystemPrompt(systemPrompt);
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
        model: options?.model || 'llama-3.3-70b-versatile',
        temperature: options?.temperature !== undefined ? options.temperature : 0.4,
        messages: [
            { role: 'system', content: enhancedPrompt },
            { role: 'user', content: userPrompt },
        ],
        ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    });
    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
        throw new Error('Empty response from AI.');
    }
    return content;
}
function buildWhisperPrompt(subjectName) {
    if (subjectName && subjectName.trim()) {
        return `This is a college lecture transcription for a ${subjectName.trim()} course. Transcribe technical and subject-specific terminology accurately, preserve proper capitalization for acronyms and proper nouns, and maintain natural punctuation based on speech pauses.`;
    }
    return `This is a college lecture transcription. Transcribe technical and subject-specific terminology accurately, preserve proper capitalization for acronyms and proper nouns, and maintain natural punctuation based on speech pauses.`;
}
async function groqTranscribeBuffer(buffer, filename, mimeType, language, subject) {
    const groq = getGroqClient();
    const file = new node_buffer_1.File([buffer], filename, { type: mimeType || 'application/octet-stream' });
    const transcription = await groq.audio.transcriptions.create({
        model: 'whisper-large-v3',
        file,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
        prompt: buildWhisperPrompt(subject),
        ...(language ? { language } : {}),
    });
    return transcription;
}
