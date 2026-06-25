import { useState, type FormEvent } from 'react'
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
  const { signInWithGoogle, signInWithEmail, resetPassword } = useAuth()
  const { toast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.')
      return
    }

    setIsEmailLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate(redirectTo.startsWith('/') ? redirectTo : '/dashboard')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setIsEmailLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address first.')
      return
    }
    try {
      await resetPassword(email)
      toast.success('Password reset email sent. Check your inbox.')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
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
            <form className="space-y-4" onSubmit={(e) => void handleEmailSignIn(e)}>
              <FloatingInput
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FloatingInput
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  className="text-xs text-muted hover:text-accent cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={isEmailLoading}
                className="auth-primary-btn mt-2 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-[#050505] cursor-pointer disabled:opacity-60"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {isEmailLoading ? 'Signing in…' : 'Log In'}
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
