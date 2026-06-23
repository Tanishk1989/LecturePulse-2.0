"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveApiError = resolveApiError;
exports.getSafeErrorMessage = getSafeErrorMessage;
exports.sendRouteError = sendRouteError;
const client_1 = require("@prisma/client");
function isDbConnectivityMessage(message) {
    const lower = message.toLowerCase();
    return (lower.includes("can't reach database server") ||
        lower.includes('connection refused') ||
        lower.includes('econnrefused') ||
        lower.includes('etimedout') ||
        lower.includes('connection timed out') ||
        lower.includes('password authentication failed') ||
        lower.includes('the database server is not accepting connections'));
}
function resolveApiError(error, fallback) {
    const raw = error instanceof Error ? error.message : String(error);
    if (error instanceof client_1.Prisma.PrismaClientInitializationError || isDbConnectivityMessage(raw)) {
        return {
            status: 503,
            code: 'DB_UNAVAILABLE',
            message: 'Database is unavailable. If you use Supabase, open your project dashboard and resume the database, then verify DATABASE_URL in BackEnd/.env.',
        };
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (['P1000', 'P1001', 'P1002', 'P1017'].includes(error.code)) {
            return {
                status: 503,
                code: 'DB_UNAVAILABLE',
                message: 'Database is unavailable. If you use Supabase, open your project dashboard and resume the database, then verify DATABASE_URL in BackEnd/.env.',
            };
        }
    }
    if (raw.includes('Invalid `prisma.') || raw.toLowerCase().includes('prisma')) {
        console.error('[API] Unhandled Prisma error:', raw);
        return {
            status: 500,
            code: 'SERVER_ERROR',
            message: fallback,
        };
    }
    return {
        status: 500,
        code: 'SERVER_ERROR',
        message: fallback,
    };
}
function getSafeErrorMessage(error, fallback) {
    return resolveApiError(error, fallback).message;
}
function sendRouteError(res, error, fallback) {
    const resolved = resolveApiError(error, fallback);
    console.error(`[API] ${fallback}`, error instanceof Error ? error.message : error);
    return res.status(resolved.status).json({
        error: resolved.message,
        code: resolved.code,
    });
}
