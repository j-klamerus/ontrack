import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/LogIn'
import AppStart from './App.tsx'
import { getSupabaseClient, isSupabaseConfigured } from './services/supabase'

const supabaseSetupError =
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart Vite.'

function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(isSupabaseConfigured)
    const [authError, setAuthError] = useState<string | null>(
        isSupabaseConfigured ? null : supabaseSetupError
    )

    useEffect(() => {
        if (!isSupabaseConfigured) {
            return
        }

        let isMounted = true
        const supabase = getSupabaseClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (isMounted) {
                setSession(nextSession)
                setAuthError(null)
                setIsLoading(false)
            }
        })

        supabase.auth.getSession()
            .then(({ data, error }) => {
                if (!isMounted) {
                    return
                }

                if (error) {
                    setAuthError(error.message)
                } else {
                    setSession(data.session)
                }
                setIsLoading(false)
            })
            .catch((error: unknown) => {
                if (isMounted) {
                    setAuthError(error instanceof Error ? error.message : 'Unable to check your sign-in status.')
                    setIsLoading(false)
                }
            })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

    const handleLogOut = async () => {
        try {
            const { error } = await getSupabaseClient().auth.signOut()
            if (error) {
                setAuthError(error.message)
            }
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.')
        }
    }

    if (isLoading) {
        return (
            <main className="login-page">
                <p role="status">Checking your sign-in status...</p>
            </main>
        )
    }

    if (session) {
        return <AppStart onLogOut={handleLogOut} authError={authError} />
    }

    return (
        <div>
            {authError && <p className="login-form-error" role="alert">{authError}</p>}
            <Login />
        </div>
    )
}

export default App