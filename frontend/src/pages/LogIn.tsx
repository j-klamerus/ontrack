import { useState, type FormEvent } from 'react'
import { getSupabaseClient } from '../services/supabase'
import './LogIn.css'

function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isRegistering && password !== confirmPassword) {
      setFormError('Passwords do not match. Please check them and try again.')
      return
    }

    setFormError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseClient()
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        })

        if (error) {
          throw error
        }

        if (!data.session) {
          setSuccessMessage('Account created. Check your email to confirm your address, then sign in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })

        if (error) {
          throw error
        }
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to authenticate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setFormError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })

      if (error) {
        throw error
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in with Google. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <div className="login-brand">
          <span>On Track</span>
        </div>

        <div className="login-intro">
          <p className="login-eyebrow">{isRegistering ? 'GET STARTED' : 'WELCOME BACK'}</p>
          <h1 id="login-heading">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </h1>
        </div>

        <button
          className="login-google"
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
        >
          Continue with Google
        </button>

        <div className="login-divider" aria-hidden="true">
          <span>or use email</span>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {isRegistering && (
            <>
              <label htmlFor="login-confirm-password">Confirm password</label>
              <input
                id="login-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={formError ? true : undefined}
                aria-describedby={formError ? 'login-form-error' : undefined}
                required
              />
            </>
          )}

          {formError && <p className="login-form-error" id="login-form-error" role="alert">{formError}</p>}
          {successMessage && <p className="login-form-success" role="status">{successMessage}</p>}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Please wait...'
              : isRegistering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="login-switch">
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setConfirmPassword('')
              setFormError(null)
              setSuccessMessage(null)
            }}
            disabled={isSubmitting}
          >
            {isRegistering ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  )
}

export default Login
