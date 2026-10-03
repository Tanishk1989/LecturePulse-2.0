import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="max-w-md space-y-4 text-center">
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-muted-foreground">This link doesn't point to a LecturePulse page. Your saved lectures are still in your library.</p>
        <div className="flex justify-center gap-4">
          <Link to="/" className="rounded-lg border border-border px-4 py-2">Go to home</Link>
          <Link to="/dashboard/lectures" className="rounded-lg bg-accent px-4 py-2 text-white">Open library</Link>
        </div>
      </section>
    </main>
  )
}
