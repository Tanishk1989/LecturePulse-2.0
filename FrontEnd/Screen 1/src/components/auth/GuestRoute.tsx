import type { ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'

interface GuestRouteProps {
  children: ReactNode
}

/** Redirects authenticated users away from login/signup pages. */
export function GuestRoute({ children }: GuestRouteProps) {
  const { user, loading } = useAuthContext()
  const [searchParams] = useSearchParams()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading…
      </div>
    )
  }

  if (user) {
    const redirect = searchParams.get('redirect')
    const destination = redirect?.startsWith('/') ? redirect : '/dashboard'
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
