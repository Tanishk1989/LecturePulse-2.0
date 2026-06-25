import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Loader2, Network, Sparkles } from 'lucide-react'
import { AddLectureHeroCTA } from '@/components/dashboard/AddLectureHeroCTA'
import { FadeUp } from '@/components/effects/FadeUp'
import { DashboardCard } from '@/components/dashboard/ui/DashboardCard'
import { AmbientPageBackground } from '@/components/dashboard/ui/AmbientPageBackground'
import { DashboardPageHeader, DashboardPageShell } from '@/components/dashboard/ui/DashboardPageShell'
import { ConceptQuizDialog } from '@/components/knowledge-graph/ConceptQuizDialog'
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph'
import { getConnectedNodeIds } from '@/lib/knowledgeGraphLayout'
import { cn } from '@/lib/utils'
import {
  MASTERY_COLORS,
  type KnowledgeGraphNode,
  type MasteryTier,
} from '@/services/knowledgeGraphService'

const LEGEND: { tier: MasteryTier; label: string }[] = [
  { tier: 'mastered', label: '70%+ mastery' },
  { tier: 'learning', label: '40–69%' },
  { tier: 'weak', label: 'Below 40%' },
  { tier: 'untested', label: 'Not tested yet' },
]

function MasteryBadge({ mastery }: { mastery: number | null }) {
  if (mastery === null) {
    return <span className="text-xs text-muted">Not tested yet</span>
  }
  return (
    <span className="text-sm font-semibold text-foreground">{mastery}% mastery</span>
  )
}

function NodeDetailPanel({
  node,
  onQuiz,
  onJump,
}: {
  node: KnowledgeGraphNode
  onQuiz: () => void
  onJump: () => void
}) {
  const colors = MASTERY_COLORS[node.masteryTier]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative space-y-5"
    >
      <div>
        <div className="flex items-start gap-2">
          <span
            className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
            style={{ background: colors.fill, border: `2px solid ${colors.stroke}` }}
          />
          <div>
            <p className="font-heading text-2xl text-foreground">{node.name}</p>
            <p className="mt-1 text-xs text-muted">{node.lectureTitle}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-foreground/85 leading-relaxed">{node.description}</p>
      </div>

      <div className="rounded-xl border border-border bg-[var(--bg-soft)] px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted mb-1">Mastery</p>
        <MasteryBadge mastery={node.mastery} />
        {node.mastery !== null && (
          <div className="mt-2 h-2 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${node.mastery}%`, background: colors.fill }}
            />
          </div>
        )}
      </div>

      {node.relatedLectureTitles && node.relatedLectureTitles.length > 0 && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted mb-2">Also in</p>
          <ul className="space-y-1">
            {node.relatedLectureTitles.map((title) => (
              <li key={title} className="text-sm text-foreground/90">
                {title}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onQuiz}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-background',
            'hover:bg-accent-soft transition-colors cursor-pointer',
          )}
        >
          <Sparkles className="h-4 w-4" />
          Quiz me on this
        </button>
        <button
          type="button"
          onClick={onJump}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground',
            'hover:border-accent/30 hover:bg-[var(--bg-soft)] transition-colors cursor-pointer',
          )}
        >
          <BookOpen className="h-4 w-4" />
          Jump to lecture
        </button>
      </div>
    </motion.div>
  )
}

export function KnowledgeGraphPage() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { nodes, links, meta, loading, selectedNode, setSelectedNode, refresh } = useKnowledgeGraph()
  const [quizNode, setQuizNode] = useState<KnowledgeGraphNode | null>(null)

  const activeId = selectedNode?.id ?? null
  const connectedIds = activeId ? getConnectedNodeIds(activeId, links) : null

  const isExtracting = Boolean(meta?.pendingExtraction || (meta?.extractingCount ?? 0) > 0)
  const isEmpty = !loading && meta?.hasLectures && nodes.length === 0 && !isExtracting
  const noLectures = !loading && !meta?.hasLectures

  return (
    <DashboardPageShell>
      <FadeUp>
        <DashboardPageHeader
          title="Knowledge Graph"
          description="Your visual map of mastery. Click nodes to explore concepts and track what you've learned."
        />
      </FadeUp>

      <div className="grid lg:grid-cols-5 gap-6">
        <FadeUp delay={0.1} className="lg:col-span-3">
          <div className="relative">
            <AmbientPageBackground variant="gold" className="rounded-3xl" />
            <DashboardCard glow="emerald" className="relative overflow-hidden min-h-[520px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[480px] gap-3 relative z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-muted">Loading your knowledge graph…</p>
                </div>
              ) : noLectures ? (
                <div className="flex flex-col items-center justify-center min-h-[480px] px-8 text-center relative z-10">
                  <div className="relative mb-6">
                    <div
                      className="pointer-events-none absolute inset-0 -m-8 rounded-full bg-accent/[0.08] blur-3xl"
                      aria-hidden
                    />
                    <Network className="relative h-12 w-12 text-muted" strokeWidth={1.25} />
                  </div>
                  <p className="text-base text-foreground font-medium">No lectures yet</p>
                  <p className="mt-2 text-sm text-muted max-w-sm leading-relaxed">
                    Upload or record a lecture to start building your knowledge graph. Concepts
                    will appear here automatically after processing.
                  </p>
                  <AddLectureHeroCTA className="mt-8" />
                </div>
              ) : isExtracting && nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[480px] gap-3 relative z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <p className="text-sm text-foreground font-medium">Extracting concepts…</p>
                  <p className="text-xs text-muted max-w-xs text-center">
                    We're analyzing your lecture content to map key concepts. This usually takes a
                    minute.
                  </p>
                </div>
              ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center min-h-[480px] px-8 text-center relative z-10">
                  <Network className="h-12 w-12 text-muted mb-4" strokeWidth={1.25} />
                  <p className="text-base text-foreground font-medium">Graph building soon</p>
                  <p className="mt-2 text-sm text-muted max-w-sm leading-relaxed">
                    Concept extraction will run when your lectures finish processing. Check back
                    shortly or review flashcards to start tracking mastery.
                  </p>
                </div>
              ) : (
                <>
                  {isExtracting && (
                    <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-2 rounded-lg border border-accent/25 bg-card/90 px-3 py-2 text-xs text-muted backdrop-blur-sm">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                      Updating graph with new concepts…
                    </div>
                  )}
                  <svg viewBox="0 0 500 320" className="w-full h-full min-h-[480px] relative z-10">
                    {links.map((link) => {
                      const fromNode = nodes.find((n) => n.id === link.fromConceptId)
                      const toNode = nodes.find((n) => n.id === link.toConceptId)
                      if (!fromNode?.x || !toNode?.x || fromNode.y == null || toNode.y == null) {
                        return null
                      }

                      const isCross = link.linkType === 'cross'
                      const isActive =
                        !connectedIds ||
                        (connectedIds.has(link.fromConceptId) &&
                          connectedIds.has(link.toConceptId))

                      return (
                        <motion.line
                          key={link.id}
                          x1={fromNode.x}
                          y1={fromNode.y}
                          x2={toNode.x}
                          y2={toNode.y}
                          stroke={
                            isCross
                              ? 'rgba(56, 189, 248, 0.45)'
                              : isActive
                                ? 'rgba(var(--color-accent-rgb),0.35)'
                                : 'color-mix(in srgb, var(--border) 60%, transparent)'
                          }
                          strokeWidth={isCross ? 2.5 : isActive ? 2 : 1}
                          strokeDasharray={isCross ? '3 5' : '6 4'}
                          animate={prefersReducedMotion ? {} : { strokeDashoffset: [0, -10] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        />
                      )
                    })}

                    {nodes.map((node, i) => {
                      if (node.x == null || node.y == null) return null
                      const isActive = !connectedIds || connectedIds.has(node.id)
                      const isSelected = node.id === activeId
                      const colors = MASTERY_COLORS[node.masteryTier]
                      const r = node.radius ?? 12

                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          onMouseEnter={() => setSelectedNode(node)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={r + 8}
                              fill="none"
                              stroke="rgba(var(--color-accent-rgb),0.35)"
                              strokeWidth={2}
                            />
                          )}
                          <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r={isSelected ? r + 2 : r}
                            fill={isActive ? colors.fill : 'var(--muted-tertiary)'}
                            stroke={isActive ? colors.stroke : 'var(--border)'}
                            strokeWidth={2}
                            animate={
                              prefersReducedMotion || !isActive
                                ? {}
                                : { opacity: [0.75, 1, 0.75] }
                            }
                            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                          />
                          {node.mastery !== null && (
                            <text
                              x={node.x}
                              y={node.y + 4}
                              textAnchor="middle"
                              fill={colors.text}
                              fontSize="9"
                              fontWeight="700"
                              pointerEvents="none"
                            >
                              {node.mastery}%
                            </text>
                          )}
                          <text
                            x={node.x}
                            y={node.y + r + 16}
                            textAnchor="middle"
                            fill={isActive ? 'var(--foreground)' : 'var(--muted)'}
                            fontSize="11"
                            fontWeight="500"
                            pointerEvents="none"
                          >
                            {node.name.length > 18 ? `${node.name.slice(0, 16)}…` : node.name}
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </>
              )}
            </DashboardCard>
          </div>
        </FadeUp>

        <FadeUp delay={0.15} className="lg:col-span-2">
          <DashboardCard className="h-full min-h-[520px] relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-ambient/[0.04] to-transparent pointer-events-none" />

            <div className="relative flex-1 p-1">
              {selectedNode ? (
                <NodeDetailPanel
                  node={selectedNode}
                  onQuiz={() => setQuizNode(selectedNode)}
                  onJump={() => navigate(`/notes/${selectedNode.lectureId}`)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                  <p className="text-base text-muted leading-relaxed max-w-xs">
                    Click a node to see its description, mastery score, and quick actions.
                  </p>
                  {nodes.length > 0 ? (
                    <p className="mt-3 text-xs text-muted-tertiary">
                      {nodes.length} concepts across your lectures
                    </p>
                  ) : noLectures ? (
                    <p className="mt-2.5 text-xs text-muted-tertiary">
                      Add a lecture first to generate your graph.
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="relative mt-auto pt-6 flex flex-wrap gap-4 border-t border-border">
              {LEGEND.map(({ tier, label }) => (
                <div key={tier} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: MASTERY_COLORS[tier].fill }}
                  />
                  <span className="text-xs text-muted">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 rounded bg-sky-400/60" style={{ borderTop: '2px dashed rgba(56,189,248,0.6)' }} />
                <span className="text-xs text-muted">Cross-lecture link</span>
              </div>
            </div>
          </DashboardCard>
        </FadeUp>
      </div>

      {quizNode && (
        <ConceptQuizDialog
          node={quizNode}
          onClose={() => setQuizNode(null)}
          onComplete={() => void refresh()}
        />
      )}
    </DashboardPageShell>
  )
}
