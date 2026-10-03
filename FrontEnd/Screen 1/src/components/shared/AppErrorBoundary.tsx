import { Component, type ReactNode } from 'react'

/** Recover from render failures and rejected lazy imports without automatic reload loops. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section role="alert" className="max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">This page couldn't load</h1>
          <p className="text-muted-foreground">Check your connection and reload to try again. If the app was just updated, reloading will open the latest version.</p>
          <p className="text-sm text-muted-foreground">Unsaved work on this page may be lost when you reload.</p>
          <div className="flex justify-center gap-4">
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-accent px-4 py-2 text-white">Reload page</button>
            <a href="/" className="rounded-lg border border-border px-4 py-2">Go to home</a>
          </div>
        </section>
      </main>
    )
  }
}
