"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const lectures_1 = __importDefault(require("./routes/lectures"));
const transcripts_1 = __importDefault(require("./routes/transcripts"));
const notes_1 = __importDefault(require("./routes/notes"));
const flashcards_1 = __importDefault(require("./routes/flashcards"));
const ai_1 = __importDefault(require("./routes/ai"));
const knowledgeGraph_1 = __importDefault(require("./routes/knowledgeGraph"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const profiles_1 = __importDefault(require("./routes/profiles"));
const streaks_1 = __importDefault(require("./routes/streaks"));
const examCountdown_1 = __importDefault(require("./routes/examCountdown"));
const search_1 = __importDefault(require("./routes/search"));
const shares_1 = __importDefault(require("./routes/shares"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const storage_1 = require("./config/storage");
const db_1 = require("./config/db");
const apiError_1 = require("./utils/apiError");
(0, storage_1.ensureUploadDirs)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(storage_1.UPLOADS_ROOT));
app.use('/api/lectures', lectures_1.default);
app.use('/api/transcripts', transcripts_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/flashcards', flashcards_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/knowledge-graph', knowledgeGraph_1.default);
app.use('/api/uploads', uploads_1.default);
app.use('/api/profiles', profiles_1.default);
app.use('/api/streaks', streaks_1.default);
app.use('/api/exam-countdown', examCountdown_1.default);
app.use('/api/search', search_1.default);
app.use('/api/shares', shares_1.default);
app.use('/api/analytics', analytics_1.default);
app.get('/', (_req, res) => {
    res.json({
        name: 'LecturePulse API',
        status: 'running',
        docs: 'All routes are under /api',
        health: '/api/health',
        database: '/api/health/db',
    });
});
app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.get('/api/health/db', async (_req, res) => {
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    }
    catch (error) {
        console.error('[Health] Database check failed:', error);
        const resolved = (0, apiError_1.resolveApiError)(error, 'Database health check failed.');
        res.status(resolved.status).json({
            status: 'unhealthy',
            database: 'disconnected',
            code: resolved.code,
            error: resolved.message,
            timestamp: new Date().toISOString(),
        });
    }
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});
async function connectDatabase(maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            console.log(`Connecting to database (attempt ${attempt}/${maxAttempts})…`);
            await db_1.prisma.$queryRaw `SELECT 1`;
            console.log('Database connection: OK');
            return;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Database connection attempt ${attempt} failed:`, message);
            if (attempt < maxAttempts) {
                const delayMs = 4000 * attempt;
                console.log(`Retrying in ${delayMs / 1000}s…`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
            }
            console.error('Database connection: FAILED after all retries. Check DATABASE_URL on Render — use port 5432 on db.PROJECT.supabase.co (direct), not port 6543 on the db host.');
            throw error;
        }
    }
}
async function startServer() {
    try {
        await connectDatabase();
    }
    catch {
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`LecturePulse 2.0 Backend listening on port ${PORT}`);
        console.log(`Local uploads served from ${path_1.default.resolve(storage_1.UPLOADS_ROOT)}`);
    });
}
void startServer();
