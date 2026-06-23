"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const apiError_1 = require("../utils/apiError");
const router = (0, express_1.Router)();
// Helper to convert UTC Date to YYYY-MM-DD local string
function getLocalDateString(utcDate, offsetMinutes) {
    const adjusted = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    return adjusted.toISOString().split('T')[0];
}
// Helper to get local Date object at midnight in user's timezone offset
function getLocalDateMidnight(utcDate, offsetMinutes) {
    const dateStr = getLocalDateString(utcDate, offsetMinutes);
    return new Date(`${dateStr}T00:00:00Z`);
}
// Find local Monday for a given date
function getLocalMonday(utcDate, offsetMinutes) {
    const localMidnight = getLocalDateMidnight(utcDate, offsetMinutes);
    const day = localMidnight.getUTCDay(); // Sun is 0, Mon is 1, etc.
    const diff = localMidnight.getUTCDate() - day + (day === 0 ? -6 : 1);
    return new Date(Date.UTC(localMidnight.getUTCFullYear(), localMidnight.getUTCMonth(), diff));
}
// Helper to compute current streak and check if yesterday was missed
function computeStreakStats(activeDaysSet, offsetMinutes) {
    const now = new Date();
    const todayStr = getLocalDateString(now, offsetMinutes);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getLocalDateString(yesterday, offsetMinutes);
    let currentStreak = 0;
    let hasMissedYesterday = false;
    if (activeDaysSet.has(todayStr)) {
        let cursor = now;
        let cursorStr = todayStr;
        while (activeDaysSet.has(cursorStr)) {
            currentStreak++;
            cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
            cursorStr = getLocalDateString(cursor, offsetMinutes);
        }
    }
    else if (activeDaysSet.has(yesterdayStr)) {
        let cursor = yesterday;
        let cursorStr = yesterdayStr;
        while (activeDaysSet.has(cursorStr)) {
            currentStreak++;
            cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
            cursorStr = getLocalDateString(cursor, offsetMinutes);
        }
    }
    else {
        // Both today and yesterday have no activity
        // But did they have an active streak before yesterday?
        // Let's check the day before yesterday
        const dayBeforeYesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const dbyStr = getLocalDateString(dayBeforeYesterday, offsetMinutes);
        if (activeDaysSet.has(dbyStr)) {
            // Yes, they had an active streak that was broken yesterday!
            hasMissedYesterday = true;
        }
    }
    return { currentStreak, hasMissedYesterday };
}
// GET /api/streaks - Retrieve user's streak dashboard info
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const offsetMinutes = Number(req.query.timezoneOffset) || 0;
    try {
        // 1. Fetch UserStreak metadata
        let userStreak = await db_1.prisma.userStreak.findUnique({
            where: { userId },
        });
        if (!userStreak) {
            userStreak = await db_1.prisma.userStreak.create({
                data: {
                    userId,
                    currentStreak: 0,
                    longestStreak: 0,
                    freezeCount: 1,
                    lastActiveDate: null,
                    lastReplenishedAt: new Date(),
                },
            });
        }
        const now = new Date();
        // 2. Weekly Freeze Replenishment (Every Monday)
        const currentLocalMonday = getLocalMonday(now, offsetMinutes);
        const lastReplenishedLocalMonday = getLocalMonday(userStreak.lastReplenishedAt, offsetMinutes);
        if (currentLocalMonday.getTime() > lastReplenishedLocalMonday.getTime()) {
            userStreak = await db_1.prisma.userStreak.update({
                where: { userId },
                data: {
                    freezeCount: 1,
                    lastReplenishedAt: now,
                },
            });
        }
        // 3. Query all study sessions and freeze histories
        const sessions = await db_1.prisma.studySession.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
        const freezes = await db_1.prisma.freezeHistory.findMany({
            where: { userId },
            orderBy: { frozenDate: 'desc' },
        });
        // 4. Map sessions to dates and group counts
        const sessionsMap = {};
        const activeDaysSet = new Set();
        sessions.forEach((s) => {
            const dateStr = getLocalDateString(s.createdAt, offsetMinutes);
            sessionsMap[dateStr] = (sessionsMap[dateStr] || 0) + 1;
            activeDaysSet.add(dateStr);
        });
        const frozenDates = [];
        freezes.forEach((f) => {
            const dateStr = getLocalDateString(f.frozenDate, offsetMinutes);
            activeDaysSet.add(dateStr);
            frozenDates.push(dateStr);
        });
        // 5. Compute streak metrics
        const { currentStreak, hasMissedYesterday } = computeStreakStats(activeDaysSet, offsetMinutes);
        // Update longest streak if current exceeded it
        let longestStreak = userStreak.longestStreak;
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            await db_1.prisma.userStreak.update({
                where: { userId },
                data: { longestStreak },
            });
        }
        // 6. Calculate weekly goal (number of active days in the current week Mon-Sun)
        let weeklyGoalDays = 0;
        const mondayMidnight = getLocalMonday(now, offsetMinutes);
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(mondayMidnight.getTime() + i * 24 * 60 * 60 * 1000);
            const checkStr = getLocalDateString(checkDate, offsetMinutes);
            if (activeDaysSet.has(checkStr)) {
                weeklyGoalDays++;
            }
        }
        // Format freeze history log
        const historyLogs = freezes.map((f) => {
            const dateStr = getLocalDateString(f.frozenDate, offsetMinutes);
            // Format as "Jun 18"
            const dateObj = new Date(`${dateStr}T00:00:00Z`);
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
            return `Used freeze on ${formattedDate}`;
        });
        res.json({
            currentStreak,
            longestStreak,
            freezeCount: userStreak.freezeCount,
            weeklyGoalDays,
            hasMissedYesterday: hasMissedYesterday && userStreak.freezeCount > 0,
            sessions: sessionsMap,
            frozenDates,
            history: historyLogs,
        });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to retrieve streak data.');
    }
});
// POST /api/streaks/session - Record a study session (must be 5+ mins on notes)
router.post('/session', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const { lectureId, duration } = req.body;
    if (!lectureId) {
        return res.status(400).json({ error: 'lectureId is required.' });
    }
    // Ensure duration is 5+ minutes (300 seconds)
    const sessionDuration = Number(duration) || 0;
    if (sessionDuration < 300) {
        return res.status(400).json({ error: 'Session duration must be 5+ minutes (300 seconds).' });
    }
    try {
        // 1. Log study session
        const session = await db_1.prisma.studySession.create({
            data: {
                userId,
                lectureId,
                duration: sessionDuration,
            },
        });
        // 2. Fetch UserStreak metadata
        let userStreak = await db_1.prisma.userStreak.findUnique({
            where: { userId },
        });
        if (!userStreak) {
            userStreak = await db_1.prisma.userStreak.create({
                data: {
                    userId,
                    currentStreak: 0,
                    longestStreak: 0,
                    freezeCount: 1,
                    lastActiveDate: null,
                    lastReplenishedAt: new Date(),
                },
            });
        }
        const now = new Date();
        const offsetMinutes = Number(req.body.timezoneOffset) || 0;
        const todayStr = getLocalDateString(now, offsetMinutes);
        // 3. Update active date
        await db_1.prisma.userStreak.update({
            where: { userId },
            data: {
                lastActiveDate: now,
            },
        });
        res.status(201).json({ success: true, session });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to record study session.');
    }
});
// POST /api/streaks/use-freeze - Consume a freeze to protect missed yesterday
router.post('/use-freeze', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    const offsetMinutes = Number(req.body.timezoneOffset) || 0;
    try {
        const userStreak = await db_1.prisma.userStreak.findUnique({
            where: { userId },
        });
        if (!userStreak || userStreak.freezeCount <= 0) {
            return res.status(400).json({ error: 'No streak freezes available.' });
        }
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = getLocalDateString(yesterday, offsetMinutes);
        const yesterdayMidnight = new Date(`${yesterdayStr}T12:00:00Z`); // Noon to safely avoid border timezone shifts
        // Check if yesterday is already frozen
        const existingFreeze = await db_1.prisma.freezeHistory.findFirst({
            where: {
                userId,
                frozenDate: {
                    gte: new Date(`${yesterdayStr}T00:00:00Z`),
                    lte: new Date(`${yesterdayStr}T23:59:59Z`),
                },
            },
        });
        if (existingFreeze) {
            return res.status(400).json({ error: 'Yesterday is already frozen.' });
        }
        // 1. Consume freeze & log history
        await db_1.prisma.$transaction([
            db_1.prisma.userStreak.update({
                where: { userId },
                data: {
                    freezeCount: { decrement: 1 },
                },
            }),
            db_1.prisma.freezeHistory.create({
                data: {
                    userId,
                    frozenDate: yesterdayMidnight,
                },
            }),
        ]);
        res.json({ success: true, message: 'Streak freeze applied for yesterday!' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to apply streak freeze.');
    }
});
// POST /api/streaks/let-go - Reset streak to 0 and let it go
router.post('/let-go', auth_1.requireAuth, async (req, res) => {
    const userId = req.user?.uid;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        await db_1.prisma.userStreak.update({
            where: { userId },
            data: {
                currentStreak: 0,
            },
        });
        res.json({ success: true, message: 'Streak reset. Start a new one today!' });
    }
    catch (error) {
        return (0, apiError_1.sendRouteError)(res, error, 'Failed to reset streak.');
    }
});
exports.default = router;
