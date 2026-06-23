export const CURRENT_CHANGELOG_VERSION = '2025.06.1'

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  highlights: string[]
}

export const changelogEntries: ChangelogEntry[] = [
  {
    version: '2025.06.1',
    date: 'June 2025',
    title: 'Smarter AI context & account hub',
    highlights: [
      'Ask AI now auto-syncs to the lecture you are viewing',
      'New Profile, Settings, and Help pages from the account menu',
      'Keyboard shortcuts modal — press ? to view all shortcuts',
    ],
  },
  {
    version: '2025.05.2',
    date: 'May 2025',
    title: 'Smart Notes refresh',
    highlights: [
      'Mind map and exam tips sections in lecture notes',
      'Improved flashcard generation from notes',
      'Faster transcript processing pipeline',
    ],
  },
]
