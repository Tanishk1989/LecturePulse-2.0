interface DataLoadErrorProps {
  title?: string
  message: string
  onRetry: () => void | Promise<void>
}

/** A failed read is not an empty library or zero progress. */
export function DataLoadError({ title = "Couldn't load your data", message, onRetry }: DataLoadErrorProps) {
  return (
    <section role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/[0.05] p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-2 text-xs text-muted">Your saved data has not been deleted. Please retry when the connection is available.</p>
      <button type="button" onClick={() => { void onRetry() }} className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        Try again
      </button>
    </section>
  )
}
