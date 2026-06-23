"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractConcepts = extractConcepts;
exports.extractAndStoreConcepts = extractAndStoreConcepts;
exports.resolveConceptIdForFlashcard = resolveConceptIdForFlashcard;
const groq_1 = require("./groq");
const parseJsonFromAi_1 = require("../utils/parseJsonFromAi");
const db_1 = require("../config/db");
const CONCEPT_EXTRACTION_SYSTEM_PROMPT = `You are an academic concept mapper for a lecture study app.
Identify the 5-10 most important distinct concepts covered in the lecture transcript.
For each concept, provide a short name (2-4 words) and a one-sentence description.
Also identify which concepts are directly related (one builds on another, or commonly discussed together).

Language Rule: All extracted concepts, names, and descriptions MUST always be in English, regardless of the language of the transcript. Do NOT respond in Hindi or Hinglish.

Return ONLY valid JSON matching this schema:
{
  "concepts": [{ "name": "string", "description": "string" }],
  "links": [{ "from": "string", "to": "string" }]
}

Use exact concept names in links. Do not wrap in markdown. Rely only on the transcript.`;
async function extractConcepts(transcript) {
    if (!transcript.trim()) {
        return { concepts: [], links: [] };
    }
    const raw = await (0, groq_1.groqChatCompletion)(CONCEPT_EXTRACTION_SYSTEM_PROMPT, `Lecture transcript:\n\n${transcript.slice(0, 120000)}`, { temperature: 0.3, jsonMode: true });
    const parsed = (0, parseJsonFromAi_1.parseJsonFromAi)(raw);
    if (!parsed || !Array.isArray(parsed.concepts)) {
        return { concepts: [], links: [] };
    }
    const concepts = parsed.concepts
        .filter((c) => c?.name?.trim() && c?.description?.trim())
        .map((c) => ({
        name: c.name.trim(),
        description: c.description.trim(),
    }));
    const nameSet = new Set(concepts.map((c) => c.name.toLowerCase()));
    const links = (parsed.links ?? [])
        .filter((l) => l?.from?.trim() &&
        l?.to?.trim() &&
        nameSet.has(l.from.trim().toLowerCase()) &&
        nameSet.has(l.to.trim().toLowerCase()) &&
        l.from.trim().toLowerCase() !== l.to.trim().toLowerCase())
        .map((l) => ({ from: l.from.trim(), to: l.to.trim() }));
    return { concepts, links };
}
function normalizeConceptName(name) {
    return name.trim().toLowerCase();
}
async function extractAndStoreConcepts(lectureId, userId, transcript) {
    await db_1.prisma.lecture.update({
        where: { id: lectureId },
        data: { kgStatus: 'extracting', updatedAt: new Date() },
    });
    try {
        const { concepts, links } = await extractConcepts(transcript);
        await db_1.prisma.$transaction(async (tx) => {
            await tx.kgLink.deleteMany({ where: { lectureId, userId } });
            await tx.kgConcept.deleteMany({ where: { lectureId, userId } });
            if (concepts.length === 0) {
                await tx.lecture.update({
                    where: { id: lectureId },
                    data: { kgStatus: 'completed', updatedAt: new Date() },
                });
                return;
            }
            const createdConcepts = await Promise.all(concepts.map((concept) => tx.kgConcept.create({
                data: {
                    lectureId,
                    userId,
                    name: concept.name,
                    description: concept.description,
                },
            })));
            const idByName = new Map(createdConcepts.map((c) => [normalizeConceptName(c.name), c.id]));
            const linkData = links
                .map((link) => {
                const fromId = idByName.get(normalizeConceptName(link.from));
                const toId = idByName.get(normalizeConceptName(link.to));
                if (!fromId || !toId || fromId === toId)
                    return null;
                return {
                    lectureId,
                    userId,
                    fromConceptId: fromId,
                    toConceptId: toId,
                };
            })
                .filter(Boolean);
            if (linkData.length > 0) {
                await tx.kgLink.createMany({ data: linkData });
            }
            await tx.lecture.update({
                where: { id: lectureId },
                data: { kgStatus: 'completed', updatedAt: new Date() },
            });
        });
    }
    catch (error) {
        await db_1.prisma.lecture.update({
            where: { id: lectureId },
            data: { kgStatus: 'failed', updatedAt: new Date() },
        });
        throw error;
    }
}
async function resolveConceptIdForFlashcard(lectureId, conceptName) {
    if (!conceptName?.trim())
        return null;
    const concept = await db_1.prisma.kgConcept.findFirst({
        where: {
            lectureId,
            name: { equals: conceptName.trim(), mode: 'insensitive' },
        },
        select: { id: true },
    });
    return concept?.id ?? null;
}
