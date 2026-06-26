"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
function notesToContent(note) {
    return {
        summary: note.summary ?? '',
        keyConcepts: note.keyConcepts ?? [],
        importantPoints: note.importantPoints ?? [],
        definitions: note.definitions ?? [],
        examples: note.examples ?? [],
        questions: note.questions ?? [],
        examTips: note.examTips ?? {},
    };
}
// POST /api/shares/lecture/:lectureId — create or refresh share link
router.post('/lecture/:lectureId', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { lectureId } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const lecture = await db_1.prisma.lecture.findFirst({
            where: { id: lectureId, userId },
            include: { lectureNotes: { where: { status: 'completed' }, take: 1 } },
        });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        if (!lecture.lectureNotes.length) {
            return res.status(400).json({ error: 'Complete notes are required before sharing.' });
        }
        const existing = await db_1.prisma.lectureShare.findFirst({
            where: { lectureId, userId },
            orderBy: { createdAt: 'desc' },
        });
        if (existing) {
            return res.json({
                shareToken: existing.shareToken,
                shareUrl: `/shared/${existing.shareToken}`,
                expiresAt: existing.expiresAt,
            });
        }
        const shareToken = crypto_1.default.randomBytes(16).toString('hex');
        const share = await db_1.prisma.lectureShare.create({
            data: {
                lectureId,
                userId,
                shareToken,
                allowMerge: true,
            },
        });
        res.status(201).json({
            shareToken: share.shareToken,
            shareUrl: `/shared/${share.shareToken}`,
            expiresAt: share.expiresAt,
        });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to create share link.');
    }
});
// GET /api/shares/:token — public read-only shared notes
router.get('/:token', async (req, res) => {
    const { token } = req.params;
    try {
        const share = await db_1.prisma.lectureShare.findUnique({
            where: { shareToken: token },
            include: {
                lecture: {
                    select: {
                        title: true,
                        subject: true,
                        lectureNotes: {
                            where: { status: 'completed' },
                            take: 1,
                        },
                    },
                },
            },
        });
        if (!share) {
            return res.status(404).json({ error: 'Share link not found or expired.' });
        }
        if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
            return res.status(410).json({ error: 'This share link has expired.' });
        }
        const note = share.lecture.lectureNotes[0];
        if (!note) {
            return res.status(404).json({ error: 'Shared notes are not available.' });
        }
        res.json({
            lectureTitle: share.lecture.title,
            subject: share.lecture.subject,
            allowMerge: share.allowMerge,
            content: notesToContent(note),
            sharedAt: share.createdAt,
        });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to load shared notes.');
    }
});
// POST /api/shares/:token/merge — merge shared notes into user's lecture
router.post('/:token/merge', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { token } = req.params;
    const { targetLectureId } = req.body;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    if (!targetLectureId) {
        return res.status(400).json({ error: 'targetLectureId is required.' });
    }
    try {
        const share = await db_1.prisma.lectureShare.findUnique({
            where: { shareToken: token },
            include: {
                lecture: {
                    select: {
                        title: true,
                        lectureNotes: { where: { status: 'completed' }, take: 1 },
                    },
                },
            },
        });
        if (!share || !share.allowMerge) {
            return res.status(404).json({ error: 'Share link not found or merge is disabled.' });
        }
        const sharedNote = share.lecture.lectureNotes[0];
        if (!sharedNote) {
            return res.status(404).json({ error: 'Shared notes are not available.' });
        }
        const targetLecture = await db_1.prisma.lecture.findFirst({
            where: { id: targetLectureId, userId },
        });
        if (!targetLecture) {
            return res.status(404).json({ error: 'Target lecture not found.' });
        }
        const mergeBanner = `[Merged from "${share.lecture.title}"]`;
        const sharedPoints = Array.isArray(sharedNote.importantPoints)
            ? sharedNote.importantPoints
            : [];
        const sharedConcepts = Array.isArray(sharedNote.keyConcepts)
            ? sharedNote.keyConcepts
            : [];
        const mergedPoints = [
            mergeBanner,
            ...(sharedNote.summary ? [sharedNote.summary.slice(0, 500)] : []),
            ...sharedPoints.slice(0, 8),
            ...sharedConcepts.slice(0, 5).map((concept) => `${concept.title}: ${concept.explanation}`),
        ];
        const existingNote = await db_1.prisma.lectureNote.findFirst({
            where: { lectureId: targetLectureId, userId },
        });
        if (existingNote) {
            const currentPoints = Array.isArray(existingNote.importantPoints)
                ? existingNote.importantPoints
                : [];
            await db_1.prisma.lectureNote.update({
                where: { id: existingNote.id },
                data: {
                    importantPoints: [...currentPoints, ...mergedPoints],
                    updatedAt: new Date(),
                },
            });
        }
        else {
            await db_1.prisma.lectureNote.create({
                data: {
                    lectureId: targetLectureId,
                    userId,
                    summary: sharedNote.summary,
                    keyConcepts: sharedNote.keyConcepts ?? [],
                    importantPoints: mergedPoints,
                    definitions: [],
                    examples: [],
                    questions: [],
                    examTips: {},
                    status: 'completed',
                },
            });
        }
        res.json({ success: true, targetLectureId, mergedCount: mergedPoints.length });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to merge shared notes.');
    }
});
exports.default = router;
