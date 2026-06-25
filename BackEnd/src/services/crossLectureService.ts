import { prisma } from '../config/db'

function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function syncCrossLectureLinks(userId: string): Promise<number> {
  const concepts = await prisma.kgConcept.findMany({
    where: { userId },
    select: { id: true, name: true, lectureId: true },
  })

  const byKey = new Map<string, Array<{ id: string; lectureId: string }>>()
  for (const concept of concepts) {
    const key = normalizeConceptName(concept.name)
    const group = byKey.get(key) ?? []
    group.push({ id: concept.id, lectureId: concept.lectureId })
    byKey.set(key, group)
  }

  await prisma.kgLink.deleteMany({
    where: { userId, linkType: 'cross' },
  })

  const crossLinks: Array<{
    lectureId: string
    userId: string
    fromConceptId: string
    toConceptId: string
    linkType: string
  }> = []

  for (const group of byKey.values()) {
    if (group.length < 2) continue

    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        if (group[i].lectureId === group[j].lectureId) continue
        crossLinks.push({
          lectureId: group[i].lectureId,
          userId,
          fromConceptId: group[i].id,
          toConceptId: group[j].id,
          linkType: 'cross',
        })
      }
    }
  }

  if (crossLinks.length > 0) {
    await prisma.kgLink.createMany({ data: crossLinks })
  }

  return crossLinks.length
}

export function getRelatedLectureIds(
  conceptId: string,
  conceptName: string,
  lectureId: string,
  allConcepts: Array<{ id: string; name: string; lectureId: string }>,
): string[] {
  const key = normalizeConceptName(conceptName)
  const related = new Set<string>()

  for (const concept of allConcepts) {
    if (concept.id === conceptId) continue
    if (normalizeConceptName(concept.name) !== key) continue
    if (concept.lectureId !== lectureId) {
      related.add(concept.lectureId)
    }
  }

  return Array.from(related)
}
