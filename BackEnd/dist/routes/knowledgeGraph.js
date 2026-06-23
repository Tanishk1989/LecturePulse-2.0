"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const conceptExtractor_1 = require("../services/conceptExtractor");
const router = (0, express_1.Router)();
function computeMastery(flashcardAttempts, quizAttempts) {
    let total = 0;
    let correct = 0;
    for (const card of flashcardAttempts) {
        total += card.reviewAttempts;
        correct += card.correctAttempts;
    }
    for (const attempt of quizAttempts) {
        total += 1;
        if (attempt.isCorrect)
            correct += 1;
    }
    if (total === 0)
        return null;
    return Math.round((correct / total) * 100);
}
function masteryTier(mastery) {
    if (mastery === null)
        return 'untested';
    if (mastery >= 70)
        return 'mastered';
    if (mastery >= 40)
        return 'learning';
    return 'weak';
}
async function backfillPendingExtractions(userId) {
    const pending = await db_1.prisma.lecture.findMany({
        where: {
            userId,
            kgStatus: { in: ['pending', 'failed'] },
            status: 'completed',
        },
        include: {
            transcripts: { where: { status: 'completed' }, take: 1 },
        },
        take: 3,
    });
    for (const lecture of pending) {
        const transcript = lecture.transcripts[0]?.fullText?.trim();
        if (!transcript)
            continue;
        void (0, conceptExtractor_1.extractAndStoreConcepts)(lecture.id, userId, transcript).catch((err) => {
            console.error(`KG backfill failed for lecture ${lecture.id}:`, err);
        });
    }
}
// GET /api/knowledge-graph - Full graph for the authenticated user
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        void backfillPendingExtractions(userId);
        const [concepts, links, lectures, flashcards, quizAttempts] = await Promise.all([
            db_1.prisma.kgConcept.findMany({
                where: { userId },
                include: { lecture: { select: { id: true, title: true, kgStatus: true } } },
                orderBy: { createdAt: 'asc' },
            }),
            db_1.prisma.kgLink.findMany({ where: { userId } }),
            db_1.prisma.lecture.findMany({
                where: { userId },
                select: { id: true, title: true, status: true, kgStatus: true },
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.flashcard.findMany({
                where: { userId },
                select: {
                    conceptId: true,
                    conceptName: true,
                    lectureId: true,
                    reviewAttempts: true,
                    correctAttempts: true,
                },
            }),
            db_1.prisma.conceptQuizAttempt.findMany({
                where: { userId },
                select: { conceptId: true, isCorrect: true },
            }),
        ]);
        const extractingCount = lectures.filter((l) => l.kgStatus === 'extracting').length;
        const hasLectures = lectures.length > 0;
        const nodes = concepts.map((concept) => {
            const relatedFlashcards = flashcards.filter((f) => f.conceptId === concept.id ||
                (f.conceptName &&
                    f.conceptName.toLowerCase() === concept.name.toLowerCase() &&
                    f.lectureId === concept.lectureId));
            const relatedQuiz = quizAttempts.filter((a) => a.conceptId === concept.id);
            const mastery = computeMastery(relatedFlashcards, relatedQuiz);
            const linkCount = links.filter((l) => l.fromConceptId === concept.id || l.toConceptId === concept.id).length;
            return {
                id: concept.id,
                name: concept.name,
                description: concept.description,
                lectureId: concept.lectureId,
                lectureTitle: concept.lecture.title,
                mastery,
                masteryTier: masteryTier(mastery),
                linkCount,
            };
        });
        res.json({
            nodes,
            links: links.map((l) => ({
                id: l.id,
                fromConceptId: l.fromConceptId,
                toConceptId: l.toConceptId,
                lectureId: l.lectureId,
            })),
            meta: {
                hasLectures,
                conceptCount: nodes.length,
                extractingCount,
                pendingExtraction: lectures.some((l) => l.kgStatus === 'pending' || l.kgStatus === 'extracting'),
            },
        });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to load knowledge graph.');
    }
});
// POST /api/knowledge-graph/extract/:lectureId - Trigger concept extraction
router.post('/extract/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const lecture = await db_1.prisma.lecture.findFirst({
            where: { id: lectureId, userId },
            include: { transcripts: { where: { status: 'completed' }, take: 1 } },
        });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        const transcript = lecture.transcripts[0]?.fullText?.trim();
        if (!transcript) {
            return res.status(400).json({ error: 'No completed transcript available for this lecture.' });
        }
        await (0, conceptExtractor_1.extractAndStoreConcepts)(lectureId, userId, transcript);
        res.json({ message: 'Concept extraction completed.' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Concept extraction failed.');
    }
});
// POST /api/knowledge-graph/quiz-attempts - Record a concept quiz answer
router.post('/quiz-attempts', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { conceptId, lectureId, question, selectedAnswer, correctAnswer, isCorrect } = req.body;
    if (!conceptId || !lectureId || !question || !selectedAnswer || !correctAnswer) {
        return res.status(400).json({ error: 'Missing required quiz attempt fields.' });
    }
    try {
        const concept = await db_1.prisma.kgConcept.findFirst({
            where: { id: conceptId, userId, lectureId },
        });
        if (!concept) {
            return res.status(404).json({ error: 'Concept not found.' });
        }
        const attempt = await db_1.prisma.conceptQuizAttempt.create({
            data: {
                userId,
                conceptId,
                lectureId,
                question: String(question),
                selectedAnswer: String(selectedAnswer),
                correctAnswer: String(correctAnswer),
                isCorrect: Boolean(isCorrect),
            },
        });
        res.status(201).json(attempt);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to save quiz attempt.');
    }
});
exports.default = router;
