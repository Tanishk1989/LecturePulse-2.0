import { Link } from 'react-router-dom'
import { GitBranch, ExternalLink } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

const footerLinks = {
  project: [
    { label: 'Architecture', href: '/#architecture' },
    { label: 'Blueprint', href: '/#blueprint' },
    { label: 'Features', href: '/#features' },
  ],
  resources: [
    { label: 'GitHub', href: 'https://github.com', external: true },
    { label: 'Documentation', href: '#' },
    { label: 'FAQ', href: '/#faq' },
  ],
  connect: [
    { label: 'Twitter', href: '#' },
    { label: 'Contact', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Open-source AI learning infrastructure. Built for students. Open for everyone.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-medium tracking-widest uppercase text-muted mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {'external' in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm text-muted hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">© {new Date().getFullYear()} LecturePulse</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted hover:text-foreground transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </footer>
  )
}
