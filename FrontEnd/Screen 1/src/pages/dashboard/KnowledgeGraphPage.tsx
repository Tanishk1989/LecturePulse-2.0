import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { Skeleton } from '@/components/dashboard/ui/Skeleton'

type NodeStatus = 'mastered' | 'learning' | 'weak' | 'unexplored'

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  status: NodeStatus
}

const statusColors: Record<NodeStatus, string> = {
  mastered: '#10B981',
  learning: '#D6A20B',
  weak: '#EF4444',
  unexplored: '#52525B',
}

const nodes: GraphNode[] = [
  { id: 'a', label: 'Topic A', x: 250, y: 140, status: 'unexplored' },
  { id: 'b', label: 'Topic B', x: 120, y: 70, status: 'unexplored' },
  { id: 'c', label: 'Topic C', x: 380, y: 70, status: 'unexplored' },
  { id: 'd', label: 'Topic D', x: 120, y: 210, status: 'unexplored' },
  { id: 'e', label: 'Topic E', x: 380, y: 210, status: 'unexplored' },
]

const edges: [string, string][] = [
  ['a', 'b'],
  ['a', 'c'],
  ['a', 'd'],
  ['a', 'e'],
  ['b', 'c'],
  ['d', 'e'],
]

export function KnowledgeGraphPage() {
  const [hovered, setHovered] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const connectedIds = hovered
    ? new Set([
        hovered,
        ...edges
          .filter(([a, b]) => a === hovered || b === hovered)
          .flat()
          .filter((id) => id !== hovered),
      ])
    : null

  const hoveredNode = nodes.find((n) => n.id === hovered)

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Knowledge Graph"
          description="Your visual map of mastery. Hover nodes to explore connections — data appears as you learn."
        />
      </FadeUp>

      <div className="grid lg:grid-cols-5 gap-6">
        <FadeUp delay={0.1} className="lg:col-span-3">
          <div className="relative">
            <AmbientPageBackground variant="gold" className="rounded-3xl" />
            <DashboardCard glow="emerald" className="relative overflow-hidden min-h-[520px]">
              <svg viewBox="0 0 500 320" className="w-full h-full min-h-[480px] relative z-10">
                {edges.map(([from, to]) => {
                  const fromNode = nodes.find((n) => n.id === from)!
                  const toNode = nodes.find((n) => n.id === to)!
                  const isActive = !connectedIds || (connectedIds.has(from) && connectedIds.has(to))

                  return (
                    <motion.line
                      key={`${from}-${to}`}
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isActive ? 'rgba(214,162,11,0.35)' : 'rgba(255,255,255,0.05)'}
                      strokeWidth={isActive ? 2 : 1}
                      strokeDasharray="6 4"
                      animate={prefersReducedMotion ? {} : { strokeDashoffset: [0, -10] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  )
                })}

                {nodes.map((node, i) => {
                  const isActive = !connectedIds || connectedIds.has(node.id)
                  const isHovered = node.id === hovered

                  return (
                    <g
                      key={node.id}
                      onMouseEnter={() => setHovered(node.id)}
                      onMouseLeave={() => setHovered(null)}
                      className="cursor-pointer"
                    >
                      <motion.circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 14 : 10}
                        fill={isActive ? statusColors[node.status] : '#27272A'}
                        animate={
                          prefersReducedMotion || !isActive
                            ? {}
                            : { opacity: [0.7, 1, 0.7] }
                        }
                        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.2 }}
                      />
                      <text
                        x={node.x}
                        y={node.y + 28}
                        textAnchor="middle"
                        fill={isActive ? '#FAFAFA' : '#71717A'}
                        fontSize="12"
                        fontWeight="500"
                      >
                        {node.label}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </DashboardCard>
          </div>
        </FadeUp>

        <FadeUp delay={0.15} className="lg:col-span-2">
          <DashboardCard className="h-full min-h-[520px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-ambient/[0.04] to-transparent pointer-events-none" />
            {hoveredNode ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <p className="font-heading text-2xl text-foreground">{hoveredNode.label}</p>
                <div className="mt-8 space-y-6">
                  <div>
                    <p className="text-sm text-muted mb-2">Mastery</p>
                    <Skeleton className="h-5 w-20 rounded-lg" />
                  </div>
                  <div>
                    <p className="text-sm text-muted mb-2">Weak Areas</p>
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                  <div>
                    <p className="text-sm text-muted mb-2">Next Review</p>
                    <Skeleton className="h-5 w-28 rounded-lg" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="relative flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <p className="text-base text-muted leading-relaxed max-w-xs">
                  Hover a node to see mastery, weak areas, and review schedule.
                </p>
                <div className="mt-8 w-full space-y-3">
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4 mx-auto rounded-lg" />
                  <Skeleton className="h-4 w-1/2 mx-auto rounded-lg" />
                </div>
              </div>
            )}

            <div className="relative mt-auto pt-8 flex flex-wrap gap-4 border-t border-white/[0.06]">
              {(['mastered', 'learning', 'weak', 'unexplored'] as NodeStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColors[s] }} />
                  <span className="text-xs text-muted capitalize">{s}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </FadeUp>
      </div>
    </DashboardPageShell>
  )
}
