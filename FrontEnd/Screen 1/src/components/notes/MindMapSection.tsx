import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, Download } from 'lucide-react'
import type { MindMapData, MindMapNode } from '@/types/notes'
import { cn } from '@/lib/utils'

interface MindMapSectionProps {
  mindMap: MindMapData | null
  lectureTitle: string
  content: any // structured notes content for fallback
}

interface PositionedNode extends MindMapNode {
  x: number
  y: number
}

export function MindMapSection({ mindMap, lectureTitle, content }: MindMapSectionProps) {
  // Panning & zooming state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1.0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const svgRef = useRef<SVGSVGElement | null>(null)

  // Interactive highlight state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<PositionedNode | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  // 1. Resolve Data: Fallback if no mind map exists
  const resolvedMindMap = useMemo(() => {
    if (mindMap && mindMap.root && Array.isArray(mindMap.nodes) && mindMap.nodes.length > 0) {
      return mindMap
    }
    // Fallback: build mind map from lecture notes content
    const root = { id: 'root', label: lectureTitle || 'Lecture Theme' }
    const nodes: MindMapNode[] = []

    const concepts = content?.keyConcepts || []
    const importantPoints = content?.importantPoints || []

    concepts.slice(0, 5).forEach((concept: any, cIdx: number) => {
      const cId = `fallback-concept-${cIdx}`
      nodes.push({
        id: cId,
        label: concept.title.split(' ').slice(0, 3).join(' ') || `Concept ${cIdx + 1}`,
        parentId: 'root',
        level: 1,
        elaboration: concept.explanation,
      })

      // Add sub-nodes from important points matching this category
      const subPoints = importantPoints.slice(cIdx * 2, (cIdx + 1) * 2)
      subPoints.forEach((pt: string, sIdx: number) => {
        nodes.push({
          id: `${cId}-sub-${sIdx}`,
          label: pt.split(' ').slice(0, 3).join(' ') || `Subconcept ${sIdx + 1}`,
          parentId: cId,
          level: 2,
          elaboration: pt,
        })
      })
    })

    return { root, nodes }
  }, [mindMap, lectureTitle, content])

  // 2. Position nodes using a beautiful radial tree layout
  const positionedNodes = useMemo(() => {
    const nodesList: PositionedNode[] = []
    const rootNode = resolvedMindMap.root

    // Add root node at origin
    nodesList.push({
      id: rootNode.id,
      label: rootNode.label,
      parentId: null,
      level: 0,
      x: 0,
      y: 0,
      elaboration: 'Lecture Main Theme',
    })

    const level1 = resolvedMindMap.nodes.filter((n) => n.level === 1)
    const level2 = resolvedMindMap.nodes.filter((n) => n.level === 2)

    const R1 = 180 // Level 1 radius
    const R2 = 100 // Level 2 radius offset

    const N1 = level1.length

    level1.forEach((l1Node, l1Idx) => {
      // Space Level 1 evenly in a circle
      const angle = l1Idx * (2 * Math.PI / Math.max(N1, 1))
      const x1 = R1 * Math.cos(angle)
      const y1 = R1 * Math.sin(angle)

      nodesList.push({
        ...l1Node,
        x: x1,
        y: y1,
      })

      const children = level2.filter((l2Node) => l2Node.parentId === l1Node.id)
      const N2 = children.length

      if (N2 > 0) {
        // Distribute Level 2 nodes in an arc centered on their parent's angle
        const arcWidth = Math.PI / Math.max(N1, 1.5) // Sweep width of arc
        children.forEach((l2Node, l2Idx) => {
          let childAngle = angle
          if (N2 > 1) {
            childAngle = (angle - arcWidth / 2) + l2Idx * (arcWidth / (N2 - 1))
          }
          const x2 = (R1 + R2) * Math.cos(childAngle)
          const y2 = (R1 + R2) * Math.sin(childAngle)

          nodesList.push({
            ...l2Node,
            x: x2,
            y: y2,
          })
        })
      }
    })

    return nodesList
  }, [resolvedMindMap])

  // 3. Compute highlighting state: determine which nodes are active/dimmed
  const activeBranchIds = useMemo(() => {
    if (!selectedNodeId) return null
    const active = new Set<string>()
    active.add(selectedNodeId)

    const node = positionedNodes.find((n) => n.id === selectedNodeId)
    if (!node) return null

    if (node.level === 0) {
      // Root selected: everything is active
      return null
    }

    if (node.level === 1) {
      // Branch node: active is root, parent (root), branch, and all its children
      active.add('root')
      positionedNodes
        .filter((n) => n.parentId === node.id)
        .forEach((c) => active.add(c.id))
    } else if (node.level === 2) {
      // Sub-node: active is root, parent branch, and this sub-node
      active.add('root')
      if (node.parentId) {
        active.add(node.parentId)
      }
    }

    return active
  }, [selectedNodeId, positionedNodes])

  // Pan dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Zoom handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomDelta = e.deltaY < 0 ? 0.08 : -0.08
    setZoom((z) => Math.min(Math.max(z + zoomDelta, 0.4), 2.5))
  }

  const resetView = () => {
    setPan({ x: 0, y: 0 })
    setZoom(1.0)
    setSelectedNodeId(null)
    setHoveredNode(null)
  }

  // SVG Export to Image helper
  const exportAsImage = () => {
    if (!svgRef.current) return

    // Clone SVG to set styles/background
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement
    svgClone.setAttribute('width', '1200')
    svgClone.setAttribute('height', '800')
    svgClone.style.background = '#090909'

    // Centered viewport transform inside export
    const g = svgClone.querySelector('g')
    if (g) {
      g.setAttribute('transform', `translate(600, 400) scale(1.1)`)
    }

    const svgString = new XMLSerializer().serializeToString(svgClone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const URL = window.URL || window.webkitURL || window
    const blobURL = URL.createObjectURL(svgBlob)

    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 800
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(image, 0, 0)
        const png = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.href = png
        downloadLink.download = `${lectureTitle.replace(/\s+/g, '_')}_mind_map.png`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
      }
    }
    image.src = blobURL
  }

  // Render connecting lines/arcs between parents and children
  const connectingLines = useMemo(() => {
    const lines: React.ReactNode[] = []

    positionedNodes.forEach((node) => {
      if (!node.parentId) return
      const parent = positionedNodes.find((p) => p.id === node.parentId)
      if (!parent) return

      const isDimmed = activeBranchIds !== null && (!activeBranchIds.has(node.id) || !activeBranchIds.has(parent.id))

      // Bezier curve coordinates for a gorgeous radial look
      const pathData = `M ${parent.x} ${parent.y} Q ${(parent.x + node.x) / 2} ${(parent.y + node.y) / 2}, ${node.x} ${node.y}`

      lines.push(
        <motion.path
          key={`line-${parent.id}-${node.id}`}
          d={pathData}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth={node.level === 1 ? 2.0 : 1.25}
          className="transition-all duration-300"
          style={{
            opacity: isDimmed ? 0.05 : node.level === 1 ? 0.35 : 0.22,
          }}
        />
      )
    })

    return lines
  }, [positionedNodes, activeBranchIds])

  return (
    <div className="relative flex h-[calc(100dvh-18rem)] min-h-[480px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-black/60 backdrop-blur-md">
      {/* Canvas Tool Panel */}
      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={resetView}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-semibold text-foreground/80 hover:bg-white/[0.08] cursor-pointer"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Reset View
        </button>
        <button
          type="button"
          onClick={exportAsImage}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.05] px-4 text-xs font-semibold text-accent hover:bg-accent/[0.12] cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Export Image
        </button>
      </div>

      {/* SVG Canvas Area */}
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Radial connector gradient */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ADFF2F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4D4D4D" stopOpacity="0.1" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${svgRef.current ? svgRef.current.clientWidth / 2 + pan.x : 350 + pan.x}, ${svgRef.current ? svgRef.current.clientHeight / 2 + pan.y : 240 + pan.y}) scale(${zoom})`}>
          {/* 1. Draw Connecting Lines */}
          {connectingLines}

          {/* 2. Draw Nodes */}
          {positionedNodes.map((node) => {
            const isRoot = node.level === 0
            const isBranch = node.level === 1

            // Width / height based on node level
            const width = isRoot ? 160 : isBranch ? 120 : 96
            const height = isRoot ? 42 : isBranch ? 34 : 28
            const rx = height / 2

            const isActive = selectedNodeId === node.id
            const isDimmed = activeBranchIds !== null && !activeBranchIds.has(node.id)

            // Select colors
            let fillClass = 'fill-[#0E0E0E]/95'
            let stroke = 'rgba(255,255,255,0.08)'
            let textClass = 'fill-white/90'

            if (isRoot) {
              fillClass = 'fill-accent/[0.08]'
              stroke = '#ADFF2F'
              textClass = 'fill-accent font-semibold'
            } else if (isActive) {
              fillClass = 'fill-accent/[0.04]'
              stroke = '#ADFF2F'
              textClass = 'fill-accent font-semibold'
            } else if (isBranch) {
              fillClass = 'fill-[#0E0E0E]/95'
              stroke = 'rgba(255,255,255,0.12)'
              textClass = 'fill-white/90'
            } else {
              fillClass = 'fill-[#0E0E0E]/95'
              stroke = 'rgba(255,255,255,0.06)'
              textClass = 'fill-white/75'
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer transition-all duration-300"
                style={{
                  opacity: isDimmed ? 0.2 : 1,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedNodeId(node.id === selectedNodeId ? null : node.id)
                }}
                onMouseEnter={(e) => {
                  setHoveredNode(node)
                  if (svgRef.current) {
                    const rect = svgRef.current.getBoundingClientRect()
                    setHoverPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    })
                  }
                }}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Visual node capsule */}
                <rect
                  x={-width / 2}
                  y={-height / 2}
                  width={width}
                  height={height}
                  rx={rx}
                  className={cn(
                    'transition-all duration-300',
                    fillClass
                  )}
                  stroke={stroke}
                  strokeWidth={isActive || isRoot ? 1.75 : 1}
                  filter={isRoot || isActive ? 'url(#glow)' : undefined}
                />
                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy="4"
                  className={cn(
                    'pointer-events-none text-[10px] sm:text-xs select-none tracking-wide transition-all',
                    textClass
                  )}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Floating Canvas Instructions */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex flex-col gap-0.5 rounded-xl border border-white/[0.06] bg-black/40 p-3 backdrop-blur-sm">
        <span className="text-[10px] font-semibold text-foreground/50 uppercase tracking-wider">Navigation Guide</span>
        <span className="text-[10px] text-white/40">🖱️ Drag background to pan | 📜 Scroll to zoom</span>
        <span className="text-[10px] text-white/40">🖲️ Click any node to focus branch</span>
      </div>

      {/* Tooltip Popup overlay */}
      <AnimatePresence>
        {hoveredNode && hoveredNode.elaboration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'absolute',
              left: `${Math.min(hoverPos.x + 14, (svgRef.current?.clientWidth ?? 0) - 260)}px`,
              top: `${Math.min(hoverPos.y + 14, (svgRef.current?.clientHeight ?? 0) - 130)}px`,
            }}
            className="z-30 max-w-[240px] pointer-events-none rounded-xl border border-accent/25 bg-black/90 p-3 shadow-2xl backdrop-blur-md"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
              {hoveredNode.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/80">
              {hoveredNode.elaboration}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
