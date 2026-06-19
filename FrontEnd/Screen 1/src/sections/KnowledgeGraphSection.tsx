import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Section } from '@/components/layout/Section'
import { Badge } from '@/components/ui/badge'
import { FadeUp } from '@/components/effects/FadeUp'
import { AmbientGlow } from '@/components/effects/AmbientGlow'

type NodeStatus = 'mastered' | 'learning' | 'weak' | 'unexplored'

interface Node {
  id: string
  label: string
  x: number
  y: number
  status: NodeStatus
  mastery: number
  nextReview: string
  weakAreas: string[]
}

const statusColors: Record<NodeStatus, string> = {
  mastered: '#10B981',
  learning: '#D6A20B',
  weak: '#EF4444',
  unexplored: '#52525B',
}

const nodes: Node[] = [
  { id: 'calculus', label: 'Calculus', x: 250, y: 150, status: 'learning', mastery: 68, nextReview: 'Tomorrow', weakAreas: ['Integration by parts'] },
  { id: 'derivatives', label: 'Derivatives', x: 120, y: 80, status: 'mastered', mastery: 92, nextReview: 'In 5 days', weakAreas: [] },
  { id: 'limits', label: 'Limits', x: 380, y: 80, status: 'mastered', mastery: 88, nextReview: 'In 3 days', weakAreas: [] },
  { id: 'integrals', label: 'Integrals', x: 120, y: 220, status: 'weak', mastery: 41, nextReview: 'Today', weakAreas: ['U-substitution', 'Partial fractions'] },
  { id: 'linear', label: 'Linear Algebra', x: 380, y: 220, status: 'unexplored', mastery: 0, nextReview: '—', weakAreas: ['Not yet studied'] },
  { id: 'eigen', label: 'Eigenvalues', x: 250, y: 260, status: 'weak', mastery: 35, nextReview: 'Today', weakAreas: ['Characteristic polynomial', 'Diagonalization'] },
]

const edges = [
  ['calculus', 'derivatives'], ['calculus', 'limits'], ['calculus', 'integrals'],
  ['calculus', 'linear'], ['calculus', 'eigen'], ['derivatives', 'limits'],
  ['integrals', 'eigen'], ['linear', 'eigen'],
]

export function KnowledgeGraphSection() {
  const [hovered, setHovered] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const hoveredNode = nodes.find((n) => n.id === hovered)
  const connectedIds = hovered
    ? new Set([
        hovered,
        ...edges.filter(([a, b]) => a === hovered || b === hovered).flat().filter((id) => id !== hovered),
      ])
    : null

  return (
    <Section id="features" className="relative overflow-hidden">
      <AmbientGlow variant="knowledge" />

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <FadeUp>
          <div>
            <Badge variant="accent" className="mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Live Analysis
            </Badge>
            <h2 className="font-heading text-4xl md:text-5xl text-foreground leading-[0.92]">
              The Mastery Map
            </h2>
            <p className="mt-4 text-muted text-lg leading-relaxed">
              A visual nervous system of your knowledge. Green means mastered,
              yellow means learning, red means weak — hover any node for details.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              {(['mastered', 'learning', 'weak', 'unexplored'] as NodeStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColors[s] }} />
                  <span className="text-xs text-muted capitalize">{s}</span>
                </div>
              ))}
            </div>

            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 glass-card rounded-xl p-5 border-l-2"
                style={{ borderLeftColor: statusColors[hoveredNode.status] }}
              >
                <p className="text-sm font-medium text-foreground">{hoveredNode.label}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted">Mastery</span>
                    <p className="text-foreground font-medium mt-0.5">{hoveredNode.mastery}%</p>
                  </div>
                  <div>
                    <span className="text-muted">Next Review</span>
                    <p className="text-foreground font-medium mt-0.5">{hoveredNode.nextReview}</p>
                  </div>
                </div>
                {hoveredNode.weakAreas.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-red">Weak areas</span>
                    <p className="text-xs text-muted mt-1">{hoveredNode.weakAreas.join(' · ')}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden cursor-pointer glow-hover">
            <div className="absolute inset-0 bg-[#10B981]/[0.06] pointer-events-none" />
            <div className="absolute inset-0 bg-[#4F46E5]/[0.04] pointer-events-none" />
            <svg viewBox="0 0 500 320" className="w-full">
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

              {nodes.map((node) => {
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
                          : { opacity: node.status === 'weak' ? [0.6, 1, 0.6] : [0.8, 1, 0.8] }
                      }
                      transition={{ duration: 2.5, repeat: Infinity }}
                      style={{
                        filter:
                          node.status === 'weak' && isActive
                            ? 'drop-shadow(0 0 10px rgba(239,68,68,0.6))'
                            : node.status === 'learning' && isActive
                              ? 'drop-shadow(0 0 8px rgba(214,162,11,0.5))'
                              : 'none',
                      }}
                    />
                    <text
                      x={node.x}
                      y={node.y + 28}
                      textAnchor="middle"
                      fill={isActive ? '#FAFAFA' : '#71717A'}
                      fontSize="11"
                      fontWeight="500"
                    >
                      {node.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </FadeUp>
      </div>
    </Section>
  )
}
