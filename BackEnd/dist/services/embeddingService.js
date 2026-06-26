"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedTexts = embedTexts;
exports.embedText = embedText;
exports.cosineSimilarity = cosineSimilarity;
const groq_1 = require("./groq");
const EMBEDDING_MODEL = 'nomic-embed-text-v1.5';
async function embedTexts(texts) {
    if (texts.length === 0)
        return [];
    const groq = (0, groq_1.getGroqClient)();
    const response = await groq.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
    });
    return response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
}
async function embedText(text) {
    const [embedding] = await embedTexts([text]);
    if (!embedding) {
        throw new Error('Failed to generate embedding.');
    }
    return embedding;
}
function cosineSimilarity(a, b) {
    const length = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
