import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthGlassCard, AuthStagger, AuthStaggerItem } from '@/components/auth/AuthGlassCard'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { SocialAuthButton } from '@/components/auth/SocialAuthButton'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/ToastProvider'
import { getAuthErrorMessage } from '@/lib/authErrors'

export function SignupPage() {
  const prefersReducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()
  const { toast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    console.log('[SignupPage] Continue with Google clicked')

    setIsGoogleLoading(true)

    try {
      await signInWithGoogle()
      console.log('[SignupPage] Google sign-in successful')
      navigate('/dashboard')
    } catch (error) {
      console.error('[SignupPage] Google sign-in failed:', error)
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
              <h2 className="font-heading text-2xl text-foreground">Start learning smarter.</h2>
              <p className="mt-2 text-sm text-muted">
                Join LecturePulse and transform lectures into mastery.
              </p>
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
              <FloatingInput label="Name" type="text" autoComplete="name" />
              <FloatingInput label="Email" type="email" autoComplete="email" />
              <FloatingInput label="Password" type="password" autoComplete="new-password" />
              <FloatingInput
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
              />

              <label className="flex cursor-pointer items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  className="auth-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-[#0A0A0A] accent-accent"
                />
                <span className="text-xs leading-relaxed text-muted">
                  I agree to{' '}
                  <a href="#" className="text-foreground/80 underline-offset-2 hover:text-accent hover:underline cursor-pointer">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-foreground/80 underline-offset-2 hover:text-accent hover:underline cursor-pointer">
                    Privacy
                  </a>
                  .
                </span>
              </label>

              <motion.button
                type="submit"
                className="auth-primary-btn mt-2 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-[#050505] cursor-pointer"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                Create Account
              </motion.button>
            </form>
          </AuthStaggerItem>

          <AuthStaggerItem>
            <p className="text-center text-sm text-muted">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-accent transition-all duration-300 hover:scale-[1.02] inline-block cursor-pointer"
              >
                Log In
              </Link>
            </p>
          </AuthStaggerItem>
        </AuthStagger>
      </AuthGlassCard>
    </AuthLayout>
  )
}
