"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// GET /api/notes - List all notes for the authenticated user
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const notes = await db_1.prisma.lectureNote.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(notes);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve notes.');
    }
});
// GET /api/notes/lecture/:lectureId - Get study notes by lecture ID
router.get('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const note = await db_1.prisma.lectureNote.findFirst({
            where: { lectureId, userId },
        });
        if (!note) {
            return res.status(404).json({ error: 'Lecture notes not found.' });
        }
        res.json(note);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve notes.');
    }
});
// POST /api/notes - Create or update study notes manually
router.post('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { lectureId, summary, keyConcepts, importantPoints, definitions, examples, mindMap, questions, examTips, status, } = req.body;
    if (!lectureId) {
        return res.status(400).json({ error: 'lectureId is required.' });
    }
    try {
        const existing = await db_1.prisma.lectureNote.findFirst({
            where: { lectureId, userId },
        });
        const payload = {
            lectureId,
            userId,
            summary: summary || null,
            keyConcepts: keyConcepts || [],
            importantPoints: importantPoints || [],
            definitions: definitions || [],
            examples: examples || [],
            mindMap: mindMap || {},
            questions: questions || [],
            examTips: examTips || {},
            status: status || 'completed',
        };
        if (existing) {
            const updated = await db_1.prisma.lectureNote.update({
                where: { id: existing.id },
                data: payload,
            });
            return res.json(updated);
        }
        else {
            const created = await db_1.prisma.lectureNote.create({
                data: payload,
            });
            return res.status(201).json(created);
        }
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to save notes.');
    }
});
// PATCH /api/notes/:id - Update notes manually by notes record ID
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { summary, keyConcepts, importantPoints, definitions, examples, mindMap, questions, examTips, status, errorMessage, } = req.body;
    try {
        const existing = await db_1.prisma.lectureNote.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Lecture notes not found.' });
        }
        const updated = await db_1.prisma.lectureNote.update({
            where: { id },
            data: {
                summary: summary !== undefined ? summary : undefined,
                keyConcepts: keyConcepts !== undefined ? keyConcepts : undefined,
                importantPoints: importantPoints !== undefined ? importantPoints : undefined,
                definitions: definitions !== undefined ? definitions : undefined,
                examples: examples !== undefined ? examples : undefined,
                mindMap: mindMap !== undefined ? mindMap : undefined,
                questions: questions !== undefined ? questions : undefined,
                examTips: examTips !== undefined ? examTips : undefined,
                status: status !== undefined ? status : undefined,
                errorMessage: errorMessage !== undefined ? errorMessage : undefined,
            },
        });
        res.json(updated);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to update notes.');
    }
});
exports.default = router;
