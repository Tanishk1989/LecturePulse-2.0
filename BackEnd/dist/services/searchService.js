"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUserLectures = searchUserLectures;
exports.getUserTags = getUserTags;
const db_1 = require("../config/db");
function normalizeQuery(query) {
    return query.trim().toLowerCase();
}
function parseTags(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.filter((item) => typeof item === 'string' && item.trim().length > 0);
}
function extractSnippet(text, query, radius = 90) {
    const normalized = text.trim();
    if (!normalized)
        return '';
    const lower = normalized.toLowerCase();
    const idx = lower.indexOf(query);
    if (idx === -1) {
        return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
    }
    const start = Math.max(0, idx - radius);
    const end = Math.min(normalized.length, idx + query.length + radius);
    let snippet = normalized.slice(start, end);
    if (start > 0)
        snippet = `…${snippet}`;
    if (end < normalized.length)
        snippet = `${snippet}…`;
    return snippet;
}
function pushMatch(map, lecture, field, snippet) {
    const existing = map.get(lecture.id);
    const tags = parseTags(lecture.tags);
    const match = { field, snippet };
    if (existing) {
        const duplicate = existing.matches.some((item) => item.field === field && item.snippet === snippet);
        if (!duplicate)
            existing.matches.push(match);
        return;
    }
    map.set(lecture.id, {
        lectureId: lecture.id,
        lectureTitle: lecture.title,
        subject: lecture.subject,
        tags,
        matches: [match],
    });
}
function jsonTextIncludes(value, query) {
    try {
        return JSON.stringify(value).toLowerCase().includes(query);
    }
    catch {
        return false;
    }
}
async function searchUserLectures(userId, rawQuery, limit = 40) {
    const query = normalizeQuery(rawQuery);
    if (!query)
        return [];
    const lectures = await db_1.prisma.lecture.findMany({
        where: { userId },
        include: {
            transcripts: {
                where: { status: 'completed' },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
            lectureNotes: {
                where: { status: 'completed' },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    const resultMap = new Map();
    for (const lecture of lectures) {
        if (lecture.title.toLowerCase().includes(query)) {
            pushMatch(resultMap, lecture, 'title', extractSnippet(lecture.title, query));
        }
        if (lecture.subject?.toLowerCase().includes(query)) {
            pushMatch(resultMap, lecture, 'subject', extractSnippet(lecture.subject, query));
        }
        for (const tag of parseTags(lecture.tags)) {
            if (tag.toLowerCase().includes(query)) {
                pushMatch(resultMap, lecture, 'tag', tag);
            }
        }
        const transcript = lecture.transcripts[0];
        if (transcript?.fullText.toLowerCase().includes(query)) {
            pushMatch(resultMap, lecture, 'transcript', extractSnippet(transcript.fullText, query));
        }
        const notes = lecture.lectureNotes[0];
        if (!notes)
            continue;
        if (notes.summary?.toLowerCase().includes(query)) {
            pushMatch(resultMap, lecture, 'summary', extractSnippet(notes.summary, query));
        }
        if (jsonTextIncludes(notes.keyConcepts, query)) {
            const concepts = notes.keyConcepts;
            for (const concept of concepts) {
                const text = `${concept.title ?? ''} ${concept.explanation ?? ''}`.trim();
                if (text.toLowerCase().includes(query)) {
                    pushMatch(resultMap, lecture, 'concept', extractSnippet(text, query));
                    break;
                }
            }
        }
        if (jsonTextIncludes(notes.definitions, query)) {
            const definitions = notes.definitions;
            for (const def of definitions) {
                const text = `${def.term ?? ''} ${def.definition ?? ''}`.trim();
                if (text.toLowerCase().includes(query)) {
                    pushMatch(resultMap, lecture, 'definition', extractSnippet(text, query));
                    break;
                }
            }
        }
    }
    return Array.from(resultMap.values()).slice(0, limit);
}
async function getUserTags(userId) {
    const lectures = await db_1.prisma.lecture.findMany({
        where: { userId },
        select: { tags: true },
    });
    const tagSet = new Set();
    for (const lecture of lectures) {
        for (const tag of parseTags(lecture.tags)) {
            tagSet.add(tag);
        }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}
