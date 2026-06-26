"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// GET /api/analytics/institution — anonymized cross-user learning analytics
router.get('/institution', auth_1.requireAuth, async (req, res) => {
    try {
        const [totalStudents, totalLectures, totalQuizAttempts, wrongAttempts, weakConcepts, feedbackRows,] = await Promise.all([
            db_1.prisma.lecture.groupBy({
                by: ['userId'],
                _count: { userId: true },
            }),
            db_1.prisma.lecture.count({ where: { status: 'completed' } }),
            db_1.prisma.conceptQuizAttempt.count(),
            db_1.prisma.conceptQuizAttempt.findMany({
                where: { isCorrect: false },
                include: { concept: { select: { name: true } } },
                take: 500,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.kgConcept.findMany({
                select: { name: true, lectureId: true },
                take: 200,
            }),
            db_1.prisma.aiFeedback.findMany({
                where: { feedback: { in: ['incorrect', 'unclear', 'too_hard', 'confusing'] } },
                select: { subject: true, feedback: true },
                take: 200,
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const conceptWrongCounts = new Map();
        for (const attempt of wrongAttempts) {
            const name = attempt.concept?.name ?? 'Unknown concept';
            conceptWrongCounts.set(name, (conceptWrongCounts.get(name) ?? 0) + 1);
        }
        const confusingTopics = [...conceptWrongCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([concept, wrongCount]) => ({
            concept,
            wrongCount,
            studentCount: wrongCount,
        }));
        const subjectConfusion = new Map();
        for (const row of feedbackRows) {
            const key = row.subject?.trim() || 'General';
            subjectConfusion.set(key, (subjectConfusion.get(key) ?? 0) + 1);
        }
        const subjectsNeedingReview = [...subjectConfusion.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([subject, reportCount]) => ({ subject, reportCount }));
        const conceptFrequency = new Map();
        for (const concept of weakConcepts) {
            conceptFrequency.set(concept.name, (conceptFrequency.get(concept.name) ?? 0) + 1);
        }
        const popularConcepts = [...conceptFrequency.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([concept, lectureCount]) => ({ concept, lectureCount }));
        res.json({
            meta: {
                anonymized: true,
                generatedAt: new Date().toISOString(),
            },
            overview: {
                activeStudents: totalStudents.length,
                completedLectures: totalLectures,
                quizAttempts: totalQuizAttempts,
            },
            confusingTopics,
            subjectsNeedingReview,
            popularConcepts,
        });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to load institution analytics.');
    }
});
exports.default = router;
