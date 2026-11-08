import { useState, type FormEvent } from 'react'
import './LogIn.css'

interface LoginProps {
  onLogIn: () => void
}

function Login({ onLogIn }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isRegistering && password !== confirmPassword) {
      setFormError('Passwords do not match. Please check them and try again.')
      return
    }

    console.log(isRegistering ? 'Creating account:' : 'Logging in:', email)
    setFormError(null)
    onLogIn()
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

          <button className="login-submit" type="submit">
            {isRegistering ? 'Create account' : 'Sign in'}
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
            }}
          >
            {isRegistering ? 'Sign in' : 'Create account'}
          </button>
        </p>
      </section>
    </main>
  )
}

export default Login
