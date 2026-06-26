"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const searchService_1 = require("../services/searchService");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// GET /api/search?q=keyword&limit=40
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 40;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 40;
    if (!q.trim()) {
        return res.json({ results: [], query: '' });
    }
    try {
        const results = await (0, searchService_1.searchUserLectures)(userId, q, limit);
        res.json({ results, query: q.trim() });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Search failed.');
    }
});
// GET /api/search/tags — all distinct tags for the user
router.get('/tags', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const tags = await (0, searchService_1.getUserTags)(userId);
        res.json({ tags });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to load tags.');
    }
});
exports.default = router;
