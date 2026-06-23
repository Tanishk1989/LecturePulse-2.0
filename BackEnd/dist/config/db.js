"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
function resolveDatabaseUrl() {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) {
        throw new Error('DATABASE_URL is not set. Add your Supabase Postgres URI to Render environment variables.');
    }
    // Supabase requires SSL; append if the Connect URI omits it.
    if (!raw.includes('sslmode=')) {
        const separator = raw.includes('?') ? '&' : '?';
        return `${raw}${separator}sslmode=require`;
    }
    return raw;
}
const databaseUrl = resolveDatabaseUrl();
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: { url: databaseUrl },
    },
});
