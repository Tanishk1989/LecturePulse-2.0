import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { layoutKnowledgeGraph } from '@/lib/knowledgeGraphLayout'
import {
  fetchKnowledgeGraph,
  type KnowledgeGraphLink,
  type KnowledgeGraphNode,
  type KnowledgeGraphResponse,
} from '@/services/knowledgeGraphService'

interface UseKnowledgeGraphResult {
  nodes: KnowledgeGraphNode[]
  links: KnowledgeGraphLink[]
  meta: KnowledgeGraphResponse['meta'] | null
  loading: boolean
  selectedNode: KnowledgeGraphNode | null
  setSelectedNode: (node: KnowledgeGraphNode | null) => void
  refresh: () => Promise<void>
}

export function useKnowledgeGraph(): UseKnowledgeGraphResult {
  const { user } = useAuthContext()
  const { toast } = useToast()
  const [nodes, setNodes] = useState<KnowledgeGraphNode[]>([])
  const [links, setLinks] = useState<KnowledgeGraphLink[]>([])
  const [meta, setMeta] = useState<KnowledgeGraphResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setNodes([])
      setLinks([])
      setMeta(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const data = await fetchKnowledgeGraph()
      setLinks(data.links)
      setMeta(data.meta)
      setNodes(layoutKnowledgeGraph(data.nodes, data.links))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load knowledge graph.')
      setNodes([])
      setLinks([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [toast, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!meta?.pendingExtraction) return

    const interval = window.setInterval(() => {
      void refresh()
    }, 8000)

    return () => window.clearInterval(interval)
  }, [meta?.pendingExtraction, refresh])

  return {
    nodes,
    links,
    meta,
    loading,
    selectedNode,
    setSelectedNode,
    refresh,
  }
}
