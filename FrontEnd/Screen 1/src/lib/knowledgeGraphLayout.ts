import type { KnowledgeGraphLink, KnowledgeGraphNode } from '@/services/knowledgeGraphService'

const BASE_RADIUS = 12
const MAX_RADIUS_BONUS = 6

export function layoutKnowledgeGraph(
  nodes: KnowledgeGraphNode[],
  links: KnowledgeGraphLink[],
  width = 500,
  height = 320,
): KnowledgeGraphNode[] {
  if (nodes.length === 0) return []

  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.34

  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2
    const linkCount = links.filter(
      (l) => l.fromConceptId === node.id || l.toConceptId === node.id,
    ).length

    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      radius: BASE_RADIUS + Math.min(linkCount, MAX_RADIUS_BONUS),
    }
  })
}

export function getConnectedNodeIds(
  nodeId: string,
  links: KnowledgeGraphLink[],
): Set<string> {
  const connected = new Set<string>([nodeId])
  for (const link of links) {
    if (link.fromConceptId === nodeId) connected.add(link.toConceptId)
    if (link.toConceptId === nodeId) connected.add(link.fromConceptId)
  }
  return connected
}
