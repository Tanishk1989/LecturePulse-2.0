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
const storage_1 = require("./config/storage");
const db_1 = require("./config/db");
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
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: 'Database is unavailable. If you use Supabase, resume your project in the dashboard and verify DATABASE_URL.',
            timestamp: new Date().toISOString(),
        });
    }
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});
app.listen(PORT, () => {
    console.log(`LecturePulse 2.0 Backend listening on port ${PORT}`);
    console.log(`Local uploads served from ${path_1.default.resolve(storage_1.UPLOADS_ROOT)}`);
    void db_1.prisma.$queryRaw `SELECT 1`
        .then(() => console.log('Database connection: OK'))
        .catch((error) => {
        console.error('Database connection: FAILED —', error instanceof Error ? error.message : error);
        console.error('Tip: If using Supabase, open the project dashboard and resume the database, then check DATABASE_URL in BackEnd/.env.');
    });
});
