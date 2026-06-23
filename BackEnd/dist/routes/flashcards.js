"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const conceptExtractor_1 = require("../services/conceptExtractor");
const router = (0, express_1.Router)();
// GET /api/flashcards - Get all user's flashcards (with optional filtering)
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { lectureId } = req.query;
    try {
        const flashcards = await db_1.prisma.flashcard.findMany({
            where: {
                userId,
                lectureId: lectureId ? String(lectureId) : undefined,
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json(flashcards);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve flashcards.');
    }
});
// GET /api/flashcards/lecture/:lectureId - Get flashcards by lecture ID
router.get('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const flashcards = await db_1.prisma.flashcard.findMany({
            where: { lectureId, userId },
            orderBy: { createdAt: 'asc' },
        });
        res.json(flashcards);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve flashcards.');
    }
});
// POST /api/flashcards/batch - Save a batch of generated flashcards
router.post('/batch', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { lectureId, cards } = req.body;
    if (!lectureId || !Array.isArray(cards)) {
        return res.status(400).json({ error: 'lectureId and cards list are required.' });
    }
    try {
        const dataToInsert = await Promise.all(cards.map(async (card) => {
            const conceptName = card.concept?.trim() || null;
            const conceptId = card.conceptId ||
                (conceptName ? await (0, conceptExtractor_1.resolveConceptIdForFlashcard)(lectureId, conceptName) : null);
            return {
                lectureId,
                userId,
                front: card.front.trim(),
                back: card.back.trim(),
                conceptId,
                conceptName,
                status: 'new',
            };
        }));
        await db_1.prisma.flashcard.createMany({ data: dataToInsert });
        const created = await db_1.prisma.flashcard.findMany({
            where: { lectureId, userId },
        });
        res.status(201).json(created);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to batch save flashcards.');
    }
});
// PATCH /api/flashcards/:id - Study/update a flashcard status and review dates
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { status, nextReviewAt, lastReviewedAt, rating } = req.body;
    try {
        const existing = await db_1.prisma.flashcard.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Flashcard not found.' });
        }
        const reviewRating = rating === 'good' || rating === 'hard' ? rating : null;
        const reviewAttempts = reviewRating !== null ? existing.reviewAttempts + 1 : existing.reviewAttempts;
        const correctAttempts = reviewRating === 'good' ? existing.correctAttempts + 1 : existing.correctAttempts;
        const updated = await db_1.prisma.flashcard.update({
            where: { id },
            data: {
                status: status !== undefined ? status : undefined,
                nextReviewAt: nextReviewAt !== undefined ? (nextReviewAt ? new Date(nextReviewAt) : null) : undefined,
                lastReviewedAt: lastReviewedAt !== undefined ? (lastReviewedAt ? new Date(lastReviewedAt) : null) : undefined,
                reviewAttempts,
                correctAttempts,
            },
        });
        res.json(updated);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to update flashcard.');
    }
});
// DELETE /api/flashcards/:id - Delete a flashcard
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const existing = await db_1.prisma.flashcard.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Flashcard not found.' });
        }
        await db_1.prisma.flashcard.delete({
            where: { id },
        });
        res.json({ message: 'Flashcard deleted.' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to delete flashcard.');
    }
});
// DELETE /api/flashcards/lecture/:lectureId - Delete all flashcards for a lecture
router.delete('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        await db_1.prisma.flashcard.deleteMany({
            where: { lectureId, userId },
        });
        res.json({ message: 'Flashcards deleted.' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to delete flashcards.');
    }
});
exports.default = router;
