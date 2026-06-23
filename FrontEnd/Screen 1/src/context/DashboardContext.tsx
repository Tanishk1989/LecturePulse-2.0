import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isXlUp } from '@/lib/breakpoints'

type TutorPanelFocusHandler = (query?: string) => void

/** Survives DashboardLayout remounts during SPA navigation; resets on full page reload. */
let tutorPanelExpandedSession = false

interface DashboardContextValue {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  tutorOpen: boolean
  openTutor: (query?: string) => void
  closeTutor: () => void
  tutorQuery: string
  setTutorQuery: (query: string) => void
  pulseExpanded: boolean
  setPulseExpanded: (expanded: boolean) => void
  togglePulse: () => void
  shortcutsOpen: boolean
  openShortcuts: () => void
  closeShortcuts: () => void
  registerTutorPanelFocus: (focus: TutorPanelFocusHandler | null) => void
  tutorPanelExpanded: boolean
  expandTutorPanel: () => void
  collapseTutorPanel: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [tutorQuery, setTutorQuery] = useState('')
  const [pulseExpanded, setPulseExpanded] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [tutorPanelExpanded, setTutorPanelExpanded] = useState(tutorPanelExpandedSession)
  const tutorPanelFocusRef = useRef<TutorPanelFocusHandler | null>(null)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const registerTutorPanelFocus = useCallback((focus: TutorPanelFocusHandler | null) => {
    tutorPanelFocusRef.current = focus
  }, [])

  const expandTutorPanel = useCallback(() => {
    tutorPanelExpandedSession = true
    setTutorPanelExpanded(true)
  }, [])

  const collapseTutorPanel = useCallback(() => {
    tutorPanelExpandedSession = false
    setTutorPanelExpanded(false)
  }, [])

  const openTutor = useCallback((query = '') => {
    setTutorQuery(query)
    setPulseExpanded(false)

    if (isXlUp()) {
      setTutorOpen(false)
      tutorPanelExpandedSession = true
      setTutorPanelExpanded(true)
      window.setTimeout(() => {
        tutorPanelFocusRef.current?.(query)
      }, 50)
      return
    }

    setTutorOpen(true)
  }, [])

  const closeTutor = useCallback(() => {
    setTutorOpen(false)
  }, [])

  const togglePulse = useCallback(() => {
    setPulseExpanded((prev) => !prev)
  }, [])

  const openShortcuts = useCallback(() => {
    setShortcutsOpen(true)
  }, [])

  const closeShortcuts = useCallback(() => {
    setShortcutsOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      tutorOpen,
      openTutor,
      closeTutor,
      tutorQuery,
      setTutorQuery,
      pulseExpanded,
      setPulseExpanded,
      togglePulse,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
      registerTutorPanelFocus,
      tutorPanelExpanded,
      expandTutorPanel,
      collapseTutorPanel,
    }),
    [
      sidebarOpen,
      tutorOpen,
      tutorQuery,
      pulseExpanded,
      shortcutsOpen,
      tutorPanelExpanded,
      toggleSidebar,
      openTutor,
      closeTutor,
      togglePulse,
      openShortcuts,
      closeShortcuts,
      registerTutorPanelFocus,
      expandTutorPanel,
      collapseTutorPanel,
    ],
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
