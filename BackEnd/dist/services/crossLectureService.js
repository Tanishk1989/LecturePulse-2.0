"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncCrossLectureLinks = syncCrossLectureLinks;
exports.getRelatedLectureIds = getRelatedLectureIds;
const db_1 = require("../config/db");
function normalizeConceptName(name) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
async function syncCrossLectureLinks(userId) {
    const concepts = await db_1.prisma.kgConcept.findMany({
        where: { userId },
        select: { id: true, name: true, lectureId: true },
    });
    const byKey = new Map();
    for (const concept of concepts) {
        const key = normalizeConceptName(concept.name);
        const group = byKey.get(key) ?? [];
        group.push({ id: concept.id, lectureId: concept.lectureId });
        byKey.set(key, group);
    }
    await db_1.prisma.kgLink.deleteMany({
        where: { userId, linkType: 'cross' },
    });
    const crossLinks = [];
    for (const group of byKey.values()) {
        if (group.length < 2)
            continue;
        for (let i = 0; i < group.length; i += 1) {
            for (let j = i + 1; j < group.length; j += 1) {
                if (group[i].lectureId === group[j].lectureId)
                    continue;
                crossLinks.push({
                    lectureId: group[i].lectureId,
                    userId,
                    fromConceptId: group[i].id,
                    toConceptId: group[j].id,
                    linkType: 'cross',
                });
            }
        }
    }
    if (crossLinks.length > 0) {
        await db_1.prisma.kgLink.createMany({ data: crossLinks });
    }
    return crossLinks.length;
}
function getRelatedLectureIds(conceptId, conceptName, lectureId, allConcepts) {
    const key = normalizeConceptName(conceptName);
    const related = new Set();
    for (const concept of allConcepts) {
        if (concept.id === conceptId)
            continue;
        if (normalizeConceptName(concept.name) !== key)
            continue;
        if (concept.lectureId !== lectureId) {
            related.add(concept.lectureId);
        }
    }
    return Array.from(related);
}
