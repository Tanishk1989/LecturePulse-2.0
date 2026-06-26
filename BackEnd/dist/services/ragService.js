"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexLectureRag = indexLectureRag;
exports.retrieveRagChunks = retrieveRagChunks;
const db_1 = require("../config/db");
const embeddingService_1 = require("./embeddingService");
const CHUNK_WORDS = 180;
const CHUNK_OVERLAP = 40;
function chunkTranscript(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0)
        return [];
    const chunks = [];
    let index = 0;
    while (index < words.length) {
        const slice = words.slice(index, index + CHUNK_WORDS);
        chunks.push(slice.join(' '));
        if (index + CHUNK_WORDS >= words.length)
            break;
        index += CHUNK_WORDS - CHUNK_OVERLAP;
    }
    return chunks;
}
async function indexLectureRag(lectureId, userId, transcript) {
    const chunks = chunkTranscript(transcript);
    if (chunks.length === 0)
        return 0;
    await db_1.prisma.ragChunk.deleteMany({ where: { lectureId, userId } });
    const batchSize = 16;
    let stored = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const embeddings = await (0, embeddingService_1.embedTexts)(batch);
        await db_1.prisma.ragChunk.createMany({
            data: batch.map((text, offset) => ({
                lectureId,
                userId,
                chunkIndex: i + offset,
                text,
                embedding: embeddings[offset] ?? [],
            })),
        });
        stored += batch.length;
    }
    return stored;
}
async function retrieveRagChunks(userId, question, lectureIds, topK = 6) {
    if (!question.trim() || lectureIds.length === 0)
        return [];
    const queryEmbedding = await (0, embeddingService_1.embedText)(question);
    const chunks = await db_1.prisma.ragChunk.findMany({
        where: {
            userId,
            lectureId: { in: lectureIds.slice(0, 10) },
        },
        include: {
            lecture: { select: { title: true } },
        },
    });
    if (chunks.length === 0)
        return [];
    const scored = chunks
        .map((chunk) => {
        const embedding = Array.isArray(chunk.embedding) ? chunk.embedding : [];
        return {
            text: chunk.text,
            lectureId: chunk.lectureId,
            lectureTitle: chunk.lecture.title,
            score: (0, embeddingService_1.cosineSimilarity)(queryEmbedding, embedding),
        };
    })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    return scored;
}
