import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bug, CircleHelp, Loader2, Mail, Send } from 'lucide-react'
import { AccountSectionShell } from '@/components/account/AccountSectionShell'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'

const SECTIONS = [
  { id: 'faq', label: 'FAQ & guides', icon: CircleHelp },
  { id: 'contact', label: 'Contact support', icon: Mail },
  { id: 'bug', label: 'Report a bug', icon: Bug },
] as const

const FAQ_ITEMS = [
  {
    q: 'How do I record a lecture?',
    a: 'Go to Create → Record Live from the sidebar, allow microphone access, and tap Start Recording. When you finish, LecturePulse uploads and transcribes automatically.',
  },
  {
    q: 'Why did my transcription fail?',
    a: 'Common causes include poor audio quality, unsupported file formats, or network interruptions during upload. Try re-uploading or recording in a quieter environment.',
  },
  {
    q: 'How do flashcards work?',
    a: 'Flashcards are generated from your lecture notes. Open Smart Notes for a lecture, visit the Flashcards section, or review all cards from the Flashcards page in the sidebar.',
  },
  {
    q: 'Can I ask AI about a specific lecture?',
    a: 'Yes. Open a lecture\'s notes page and the Ask AI panel on the right will automatically scope questions to that lecture. You can also change context manually from the Tutor Context dropdown.',
  },
  {
    q: 'How do I import a YouTube video?',
    a: 'Use Create → Import YouTube, paste the video URL, and LecturePulse will extract audio and process it like any other lecture.',
  },
]

const SUPPORT_EMAIL = 'support@lecturepulse.app'

function buildMailto(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function HelpPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection = searchParams.get('section') || 'faq'

  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [bugSubject, setBugSubject] = useState('')
  const [bugMessage, setBugMessage] = useState('')
  const [sending, setSending] = useState(false)

  const setSection = useCallback(
    (id: string) => setSearchParams({ section: id }),
    [setSearchParams],
  )

  useEffect(() => {
    if (activeSection === 'bug' && !bugMessage) {
      const context = [
        `Page: ${window.location.href}`,
        `Browser: ${navigator.userAgent}`,
        `Screen: ${window.innerWidth}x${window.innerHeight}`,
        '',
        'Describe the bug:',
      ].join('\n')
      setBugMessage(context)
    }
  }, [activeSection, bugMessage])

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactSubject.trim() || !contactMessage.trim()) {
      toast.error('Please fill in subject and message.')
      return
    }
    setSending(true)
    window.location.href = buildMailto(`Support: ${contactSubject}`, contactMessage)
    setTimeout(() => {
      setSending(false)
      toast.success('Opening your email client…')
    }, 400)
  }

  const handleBugReport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bugSubject.trim() || !bugMessage.trim()) {
      toast.error('Please fill in subject and description.')
      return
    }
    setSending(true)
    window.location.href = buildMailto(`Bug: ${bugSubject}`, bugMessage)
    setTimeout(() => {
      setSending(false)
      toast.success('Opening your email client…')
    }, 400)
  }

  return (
    <AccountSectionShell
      title="Help"
      description="Answers, guides, and ways to reach our team."
      sections={SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon }))}
      activeSection={activeSection}
      onSectionChange={setSection}
    >
      {activeSection === 'faq' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">FAQ & guides</h2>
          <ul className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <li
                key={item.q}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
              >
                <p className="text-sm font-medium text-foreground">{item.q}</p>
                <p className="mt-1.5 text-sm text-muted leading-relaxed">{item.a}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeSection === 'contact' && (
        <form className="space-y-5" onSubmit={handleContact}>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Contact support</h2>
            <p className="mt-1 text-sm text-muted">
              Send us a message — we&apos;ll open your email client with a pre-filled draft to{' '}
              <span className="text-foreground">{SUPPORT_EMAIL}</span>.
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted">Subject</span>
            <input
              value={contactSubject}
              onChange={(e) => setContactSubject(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Message</span>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={6}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
              required
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background',
              'hover:bg-accent-soft transition-all cursor-pointer disabled:opacity-40',
            )}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send message
          </button>
        </form>
      )}

      {activeSection === 'bug' && (
        <form className="space-y-5" onSubmit={handleBugReport}>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Report a bug</h2>
            <p className="mt-1 text-sm text-muted">
              Include steps to reproduce. Page and browser info are pre-filled to help us debug
              faster.
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-muted">Subject</span>
            <input
              value={bugSubject}
              onChange={(e) => setBugSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent/30"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Description</span>
            <textarea
              value={bugMessage}
              onChange={(e) => setBugMessage(e.target.value)}
              rows={10}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-xs text-foreground outline-none focus:border-accent/30"
              required
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background',
              'hover:bg-accent-soft transition-all cursor-pointer disabled:opacity-40',
            )}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit bug report
          </button>
        </form>
      )}
    </AccountSectionShell>
  )
}
