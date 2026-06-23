export interface KeyboardShortcut {
  id: string
  action: string
  keys: string[]
  category: 'Navigation' | 'AI & Search' | 'Recording' | 'General'
}

export const keyboardShortcuts: KeyboardShortcut[] = [
  {
    id: 'command-palette',
    action: 'Open Ask AI',
    keys: ['⌘', 'K'],
    category: 'AI & Search',
  },
  {
    id: 'shortcuts-help',
    action: 'Show keyboard shortcuts',
    keys: ['?'],
    category: 'General',
  },
  {
    id: 'open-tutor-mobile',
    action: 'Open Ask AI panel',
    keys: ['⌘', 'J'],
    category: 'AI & Search',
  },
  {
    id: 'dashboard-home',
    action: 'Go to Dashboard',
    keys: ['G', 'then', 'D'],
    category: 'Navigation',
  },
  {
    id: 'lectures',
    action: 'Go to Lectures library',
    keys: ['G', 'then', 'L'],
    category: 'Navigation',
  },
  {
    id: 'record',
    action: 'Start live recording',
    keys: ['G', 'then', 'R'],
    category: 'Recording',
  },
  {
    id: 'escape',
    action: 'Close modal or panel',
    keys: ['Esc'],
    category: 'General',
  },
]

export function formatShortcutKeys(keys: string[]): string {
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return keys
    .map((key) => {
      if (key === '⌘') return isMac ? '⌘' : 'Ctrl'
      if (key === 'then') return 'then'
      return key
    })
    .join(' ')
}
