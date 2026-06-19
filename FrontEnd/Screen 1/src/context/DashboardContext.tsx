import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [tutorQuery, setTutorQuery] = useState('')
  const [pulseExpanded, setPulseExpanded] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  const openTutor = useCallback((query = '') => {
    setTutorQuery(query)
    setTutorOpen(true)
    setPulseExpanded(false)
  }, [])

  const closeTutor = useCallback(() => {
    setTutorOpen(false)
  }, [])

  const togglePulse = useCallback(() => {
    setPulseExpanded((prev) => !prev)
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
    }),
    [
      sidebarOpen,
      tutorOpen,
      tutorQuery,
      pulseExpanded,
      toggleSidebar,
      openTutor,
      closeTutor,
      togglePulse,
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
