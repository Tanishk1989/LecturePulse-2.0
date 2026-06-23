"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// GET /api/transcripts - Get all transcripts for the authenticated user
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const transcripts = await db_1.prisma.transcript.findMany({
            where: { userId },
            select: { lectureId: true, fullText: true },
        });
        res.json(transcripts);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve transcripts.');
    }
});
// GET /api/transcripts/lecture/:lectureId - Get transcript by lectureId
router.get('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const transcript = await db_1.prisma.transcript.findFirst({
            where: { lectureId, userId },
        });
        if (!transcript) {
            return res.status(404).json({ error: 'Transcript not found.' });
        }
        res.json(transcript);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve transcript.');
    }
});
// PUT /api/transcripts - Save or update transcript metadata manually
router.post('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { lectureId, text, language, durationSeconds, segments, status, } = req.body;
    if (!lectureId) {
        return res.status(400).json({ error: 'lectureId is required.' });
    }
    try {
        const existing = await db_1.prisma.transcript.findFirst({
            where: { lectureId, userId },
        });
        const payload = {
            lectureId,
            userId,
            fullText: text || '',
            language: language || null,
            durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
            segments: segments || [],
            status: status || 'completed',
        };
        if (existing) {
            const updated = await db_1.prisma.transcript.update({
                where: { id: existing.id },
                data: payload,
            });
            return res.json(updated);
        }
        else {
            const created = await db_1.prisma.transcript.create({
                data: payload,
            });
            return res.status(201).json(created);
        }
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to save transcript.');
    }
});
// PATCH /api/transcripts/lecture/:lectureId - Update transcript by lectureId
router.patch('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { text, fullText, language, durationSeconds, segments, status, errorMessage, } = req.body;
    try {
        const existing = await db_1.prisma.transcript.findFirst({
            where: { lectureId, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Transcript not found.' });
        }
        const textValue = text !== undefined ? text : fullText;
        const updated = await db_1.prisma.transcript.update({
            where: { id: existing.id },
            data: {
                fullText: textValue !== undefined ? textValue : undefined,
                language: language !== undefined ? language : undefined,
                durationSeconds: durationSeconds !== undefined ? (durationSeconds ? parseInt(durationSeconds, 10) : null) : undefined,
                segments: segments !== undefined ? segments : undefined,
                status: status !== undefined ? status : undefined,
                errorMessage: errorMessage !== undefined ? errorMessage : undefined,
            },
        });
        res.json(updated);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to update transcript.');
    }
});
exports.default = router;
