"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
function resolveDatabaseUrl() {
    const raw = process.env.DATABASE_URL?.trim();
    if (!raw) {
        throw new Error('DATABASE_URL is not set. Add your Supabase Postgres URI to BackEnd/.env (local) or Render environment variables.');
    }
    let url = raw;
    // Supabase transaction pooler (port 6543) requires pgbouncer mode for Prisma.
    if (url.includes(':6543/') && !url.includes('pgbouncer=')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}pgbouncer=true`;
    }
    // Supabase requires SSL when omitted from the connection URI.
    if (!url.includes('sslmode=')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}sslmode=require`;
    }
    if (!url.includes('connect_timeout=')) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}connect_timeout=30`;
    }
    return url;
}
const databaseUrl = resolveDatabaseUrl();
exports.prisma = new client_1.PrismaClient({
    datasources: {
        db: { url: databaseUrl },
    },
});
