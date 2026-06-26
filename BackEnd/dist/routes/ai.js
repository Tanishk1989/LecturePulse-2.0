"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const groq_1 = require("../services/groq");
const outputLanguage_1 = require("../services/outputLanguage");
const db_1 = require("../config/db");
const transcribeService_1 = require("../services/transcribeService");
const youtubeService_1 = require("../services/youtubeService");
const processingService_1 = require("../services/processingService");
const notesGenerator_1 = require("../services/notesGenerator");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// POST /api/ai/chat - Proxy chat completion request to Groq SDK
router.post('/chat', auth_1.requireAuth, async (req, res) => {
    const { systemPrompt, userPrompt, temperature, model, outputLanguage } = req.body;
    if (!systemPrompt || !userPrompt) {
        return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' });
    }
    try {
        const content = await (0, groq_1.groqChatCompletion)(systemPrompt, userPrompt, {
            temperature,
            model,
            outputLanguage: (0, outputLanguage_1.normalizeOutputLanguage)(outputLanguage),
        });
        res.json({ content });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'AI chat completion failed.');
    }
});
// POST /api/ai/transcribe - Transcribe audio from a public URL (Firebase, etc.)
router.post('/transcribe', auth_1.requireAuth, async (req, res) => {
    const { audioUrl, language } = req.body;
    if (!audioUrl || typeof audioUrl !== 'string') {
        return res.status(400).json({ error: 'audioUrl is required.' });
    }
    try {
        const result = await (0, transcribeService_1.transcribeFromUrl)(audioUrl, language);
        res.json(result);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Processing failed.');
    }
});
// POST /api/ai/transcribe-youtube - Resolve YouTube audio and transcribe
router.post('/transcribe-youtube', auth_1.requireAuth, async (req, res) => {
    const { youtubeUrl, language } = req.body;
    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
        return res.status(400).json({ error: 'youtubeUrl is required.' });
    }
    try {
        const audioUrl = await (0, youtubeService_1.resolveYouTubeTranscriptionUrl)(youtubeUrl);
        const result = await (0, transcribeService_1.transcribeFromUrl)(audioUrl, language);
        res.json(result);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'YouTube processing failed.');
    }
});
// POST /api/ai/generate-notes - Generate structured notes from transcript text
router.post('/generate-notes', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { transcript, outputLanguage } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        return res.status(400).json({ error: 'lecture content is required.' });
    }
    try {
        const content = await (0, notesGenerator_1.generateStructuredNotes)(transcript, userId, {
            outputLanguage: (0, outputLanguage_1.normalizeOutputLanguage)(outputLanguage),
        });
        res.json(content);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Notes generation failed.');
    }
});
// POST /api/ai/extract-pdf - Extract text from a hosted PDF URL
router.post('/extract-pdf', auth_1.requireAuth, async (req, res) => {
    const { pdfUrl } = req.body;
    if (!pdfUrl || typeof pdfUrl !== 'string') {
        return res.status(400).json({ error: 'pdfUrl is required.' });
    }
    try {
        const result = await (0, processingService_1.extractPdfTextFromUrl)(pdfUrl);
        res.json(result);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'PDF extraction failed.');
    }
});
// POST /api/ai/stream-chat - Stream chat completion response using Server-Sent Events (SSE)
router.post('/stream-chat', auth_1.requireAuth, async (req, res) => {
    const { systemPrompt, userPrompt, temperature, model, outputLanguage } = req.body;
    if (!systemPrompt || !userPrompt) {
        return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' });
    }
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    try {
        const groq = (0, groq_1.getGroqClient)();
        const stream = await groq.chat.completions.create({
            model: model || 'llama-3.3-70b-versatile',
            temperature: temperature !== undefined ? temperature : 0.4,
            messages: [
                {
                    role: 'system',
                    content: (0, groq_1.enhanceSystemPrompt)(systemPrompt, {
                        outputLanguage: (0, outputLanguage_1.normalizeOutputLanguage)(outputLanguage),
                    }),
                },
                { role: 'user', content: userPrompt },
            ],
            stream: true,
        });
        for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
    }
    catch (error) {
        console.error('[Streaming Chat] Failed:', error);
        res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Streaming chat failed.' })}\n\n`);
        res.end();
    }
});
// POST /api/ai/feedback - Save user feedback on generated content
router.post('/feedback', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { contentType, contentId, lectureId, subject, feedback } = req.body;
    if (!contentType || !lectureId || !feedback) {
        return res.status(400).json({ error: 'contentType, lectureId, and feedback are required.' });
    }
    try {
        const record = await db_1.prisma.aiFeedback.create({
            data: {
                userId,
                contentType,
                contentId: contentId || null,
                lectureId,
                subject: subject || null,
                feedback,
            },
        });
        res.json({ success: true, record });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to save feedback.');
    }
});
// GET /api/ai/feedback - Retrieve all user feedback logs (admin/analytics query)
router.get('/feedback', auth_1.requireAuth, async (req, res) => {
    try {
        const records = await db_1.prisma.aiFeedback.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(records);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve feedback.');
    }
});
// POST /api/ai/rag-retrieve - Semantic search over indexed lecture chunks
router.post('/rag-retrieve', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { question, lectureIds, topK } = req.body;
    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'question is required.' });
    }
    if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
        return res.status(400).json({ error: 'lectureIds array is required.' });
    }
    try {
        const { retrieveRagChunks } = await Promise.resolve().then(() => __importStar(require('../services/ragService')));
        const chunks = await retrieveRagChunks(userId, question, lectureIds.filter((id) => typeof id === 'string'), typeof topK === 'number' ? topK : 6);
        res.json({ chunks });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'RAG retrieval failed.');
    }
});
// POST /api/ai/translate - Translate lecture content
router.post('/translate', auth_1.requireAuth, async (req, res) => {
    const { text, targetLanguage, contextLabel } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'text is required.' });
    }
    if (!targetLanguage || typeof targetLanguage !== 'string') {
        return res.status(400).json({ error: 'targetLanguage is required.' });
    }
    try {
        const { translateText } = await Promise.resolve().then(() => __importStar(require('../services/translationService')));
        const translated = await translateText(text, targetLanguage, contextLabel);
        res.json({ translated });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Translation failed.');
    }
});
// POST /api/ai/detect-speakers - Label transcript segments by speaker role
router.post('/detect-speakers', auth_1.requireAuth, async (req, res) => {
    const { segments, subject, useLlm } = req.body;
    if (!Array.isArray(segments) || segments.length === 0) {
        return res.status(400).json({ error: 'segments array is required.' });
    }
    try {
        const { detectSpeakersInSegments } = await Promise.resolve().then(() => __importStar(require('../services/speakerDetectionService')));
        const labeled = await detectSpeakersInSegments(segments, {
            subject: typeof subject === 'string' ? subject : undefined,
            useLlm: useLlm !== false,
        });
        res.json({ segments: labeled });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Speaker detection failed.');
    }
});
exports.default = router;
