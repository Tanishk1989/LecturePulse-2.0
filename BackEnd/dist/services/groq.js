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
const outputLanguage_1 = require("./outputLanguage");
function getGroqClient() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not configured.');
    }
    return new groq_sdk_1.default({ apiKey });
}
function enhanceSystemPrompt(systemPrompt, options = {}) {
    if (options.skipEnhancement) {
        return systemPrompt;
    }
    const outputLanguage = (0, outputLanguage_1.normalizeOutputLanguage)(options.outputLanguage);
    const marker = 'LecturePulse language policy';
    if (systemPrompt.includes(marker)) {
        return systemPrompt;
    }
    const rules = [`You are an AI study assistant for LecturePulse. ${marker}:`];
    if (options.transcriptOnly) {
        rules.push(outputLanguage_1.TRANSCRIPT_LANGUAGE_RULE);
    }
    else if (outputLanguage === 'match') {
        rules.push(outputLanguage_1.MATCH_LECTURE_OUTPUT_RULE);
    }
    else {
        rules.push(outputLanguage_1.STRICT_ENGLISH_OUTPUT_RULE);
    }
    return `${rules.join('\n\n')}\n\n${systemPrompt}`;
}
async function groqChatCompletion(systemPrompt, userPrompt, options) {
    const enhancedPrompt = enhanceSystemPrompt(systemPrompt, {
        outputLanguage: options?.outputLanguage,
        transcriptOnly: options?.transcriptOnly,
        skipEnhancement: options?.skipEnhancement,
    });
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
