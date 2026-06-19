import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthGlassCard, AuthStagger, AuthStaggerItem } from '@/components/auth/AuthGlassCard'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SocialAuthButton } from '@/components/auth/SocialAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/ToastProvider'
import { getAuthErrorMessage } from '@/lib/authErrors'

export function LoginPage() {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const { signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)

    try {
      await signInWithGoogle()
      navigate(redirectTo.startsWith('/') ? redirectTo : '/dashboard')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <AuthLayout>
      <AuthGlassCard>
        <AuthStagger>
          <AuthStaggerItem>
            <div className="mb-1">
              <h2 className="font-heading text-2xl text-foreground">Welcome back</h2>
              <p className="mt-2 text-sm text-muted">Continue your learning journey.</p>
            </div>
          </AuthStaggerItem>

          <AuthStaggerItem>
            <div className="space-y-3">
              <SocialAuthButton
                provider="google"
                onClick={handleGoogleSignIn}
                loading={isGoogleLoading}
              />
              <SocialAuthButton provider="github" disabled />
            </div>
          </AuthStaggerItem>

          <AuthStaggerItem>
            <AuthDivider />
          </AuthStaggerItem>

          <AuthStaggerItem>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <FloatingInput label="Email" type="email" autoComplete="email" />
              <FloatingInput label="Password" type="password" autoComplete="current-password" />

              <motion.button
                type="submit"
                className="auth-primary-btn mt-2 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-[#050505] cursor-pointer"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                Log In
              </motion.button>
            </form>
          </AuthStaggerItem>

          <AuthStaggerItem>
            <p className="text-center text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-accent transition-all duration-300 hover:scale-[1.02] inline-block cursor-pointer"
              >
                Sign Up
              </Link>
            </p>
          </AuthStaggerItem>
        </AuthStagger>
      </AuthGlassCard>
    </AuthLayout>
  )
}
