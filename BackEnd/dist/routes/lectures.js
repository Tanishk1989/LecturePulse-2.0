"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const storage_1 = require("../config/storage");
const processingService_1 = require("../services/processingService");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// GET /api/lectures - List all lectures for the authenticated user
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const lectures = await db_1.prisma.lecture.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(lectures);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve lectures.');
    }
});
// GET /api/lectures/:id - Get a single lecture by ID
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const lecture = await db_1.prisma.lecture.findFirst({
            where: { id, userId },
        });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        res.json(lecture);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve lecture.');
    }
});
// POST /api/lectures - Create a new lecture record
router.post('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { id, title, fileType, fileUrl, duration, source, subject, } = req.body;
    if (!title || !fileType || !fileUrl) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }
    try {
        const lecture = await db_1.prisma.lecture.create({
            data: {
                id: id || undefined,
                userId,
                title: title.trim(),
                fileType,
                fileUrl,
                duration: duration ? parseInt(duration, 10) : null,
                status: 'uploaded',
                source: source || 'upload',
                subject: subject || null,
            },
        });
        res.status(201).json(lecture);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to create lecture.');
    }
});
// PATCH /api/lectures/:id - Update lecture properties (e.g. title, favorite, status)
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { title, favorite, status } = req.body;
    try {
        // Verify ownership
        const existing = await db_1.prisma.lecture.findFirst({
            where: { id, userId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        const updated = await db_1.prisma.lecture.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : undefined,
                favorite: favorite !== undefined ? favorite : undefined,
                status: status !== undefined ? status : undefined,
            },
        });
        res.json(updated);
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to update lecture.');
    }
});
// DELETE /api/lectures/:id - Delete a lecture, its database records, and its storage file
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const lecture = await db_1.prisma.lecture.findFirst({
            where: { id, userId },
        });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        if (lecture.fileUrl) {
            try {
                (0, storage_1.deleteFileByUrl)(lecture.fileUrl);
            }
            catch (err) {
                console.warn('Local file deletion failed or file did not exist:', err);
            }
        }
        // Cascade delete on relations is handled by database if configured,
        // otherwise Prisma client can delete them or cascade via schema.
        await db_1.prisma.lecture.delete({
            where: { id },
        });
        res.json({ message: 'Lecture deleted successfully.' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to delete lecture.');
    }
});
// POST /api/lectures/:id/process - Trigger background lecture transcription & notes generation
router.post('/:id/process', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { generateNotes, forceRetranscribe } = req.body;
    try {
        const lecture = await db_1.prisma.lecture.findFirst({
            where: { id, userId },
        });
        if (!lecture) {
            return res.status(404).json({ error: 'Lecture not found.' });
        }
        if (lecture.status === 'processing') {
            return res.status(202).json({ status: 'processing', id });
        }
        // Update status to processing
        await db_1.prisma.lecture.update({
            where: { id },
            data: { status: 'processing' },
        });
        // Run processing job in background asynchronously
        void (0, processingService_1.triggerLectureProcessing)(id, userId, {
            generateNotes: generateNotes !== false,
            forceRetranscribe: forceRetranscribe === true,
        }).catch((err) => {
            console.error(`Background processing job failed for lecture ${id}:`, err);
        });
        res.status(202).json({ status: 'processing', id });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to initiate processing.');
    }
});
exports.default = router;
