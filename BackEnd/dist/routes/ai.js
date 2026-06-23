"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const groq_1 = require("../services/groq");
const db_1 = require("../config/db");
const transcribeService_1 = require("../services/transcribeService");
const youtubeService_1 = require("../services/youtubeService");
const processingService_1 = require("../services/processingService");
const notesGenerator_1 = require("../services/notesGenerator");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// POST /api/ai/chat - Proxy chat completion request to Groq SDK
router.post('/chat', auth_1.requireAuth, async (req, res) => {
    const { systemPrompt, userPrompt, temperature, model } = req.body;
    if (!systemPrompt || !userPrompt) {
        return res.status(400).json({ error: 'systemPrompt and userPrompt are required.' });
    }
    try {
        const content = await (0, groq_1.groqChatCompletion)(systemPrompt, userPrompt, {
            temperature,
            model,
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
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        return res.status(400).json({ error: 'lecture content is required.' });
    }
    try {
        const content = await (0, notesGenerator_1.generateStructuredNotes)(transcript, userId);
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
    const { systemPrompt, userPrompt, temperature, model } = req.body;
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
                { role: 'system', content: (0, groq_1.enhanceSystemPrompt)(systemPrompt) },
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
exports.default = router;
