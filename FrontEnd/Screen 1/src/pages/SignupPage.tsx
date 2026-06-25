import { useState, type FormEvent } from 'react'
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
  const { signInWithGoogle, signUpWithEmail } = useAuth()
  const { toast } = useToast()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleEmailSignUp = async (event: FormEvent) => {
    event.preventDefault()

    if (!acceptedTerms) {
      toast.error('Please accept the Terms and Privacy policy.')
      return
    }
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsEmailLoading(true)
    try {
      await signUpWithEmail(email, password, name)
      toast.success('Account created successfully.')
      navigate('/dashboard')
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setIsEmailLoading(false)
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
            <form className="space-y-4" onSubmit={(e) => void handleEmailSignUp(e)}>
              <FloatingInput
                label="Name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FloatingInput
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <label className="flex cursor-pointer items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
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
                disabled={isEmailLoading}
                className="auth-primary-btn mt-2 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-[#050505] cursor-pointer disabled:opacity-60"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {isEmailLoading ? 'Creating account…' : 'Create Account'}
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
