import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/LogIn'
import AppStart from './App.tsx'
import {
    getSupabaseClient,
    isSupabaseConfigured,
    restoreSessionAfterGmailOAuthRedirect
} from './services/supabase'
import {
    activateUserData,
    clearActiveUserData,
    flushUserDataWrites,
    hasPendingUserDataWrites,
    importLegacyUserData,
    retryUserDataSync,
    skipLegacyUserDataImport,
    USER_DATA_SYNC_EVENT,
    type UserDataSyncEvent
} from './services/userData'

const supabaseSetupError =
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart Vite.'

function App() {
    const [session, setSession] = useState<Session | null>(null)
    const [authResolved, setAuthResolved] = useState(!isSupabaseConfigured)
    const [dataReadyUserId, setDataReadyUserId] = useState<string | null>(null)
    const [authError, setAuthError] = useState<string | null>(
        isSupabaseConfigured ? null : supabaseSetupError
    )
    const [dataSyncError, setDataSyncError] = useState<string | null>(null)
    const [legacyImportPending, setLegacyImportPending] = useState(false)
    const [isImportingLegacyData, setIsImportingLegacyData] = useState(false)
    const userId = session?.user.id

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
                setAuthResolved(true)
                if (!nextSession) {
                    setDataReadyUserId(null)
                    setLegacyImportPending(false)
                }
            }
        })

        const initializeAuth = async () => {
            try {
                await restoreSessionAfterGmailOAuthRedirect()
                const { data, error } = await supabase.auth.getSession()
                if (!isMounted) {
                    return
                }

                if (error) {
                    setAuthError(error.message)
                } else {
                    setSession(data.session)
                    if (!data.session) {
                        setDataReadyUserId(null)
                        setLegacyImportPending(false)
                    }
                }
                setAuthResolved(true)
            } catch (error: unknown) {
                if (isMounted) {
                    setAuthError(error instanceof Error ? error.message : 'Unable to check your sign-in status.')
                    setAuthResolved(true)
                }
            }
        }
        void initializeAuth()

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

    useEffect(() => {
        const handleSyncEvent = (event: Event) => {
            const detail = (event as CustomEvent<UserDataSyncEvent>).detail
            if (detail.status === 'error') {
                setDataSyncError(detail.error ?? 'Unable to save your data to Supabase.')
            } else if (detail.status === 'saved') {
                setDataSyncError(null)
            }
        }

        window.addEventListener(USER_DATA_SYNC_EVENT, handleSyncEvent)
        return () => window.removeEventListener(USER_DATA_SYNC_EVENT, handleSyncEvent)
    }, [])

    useEffect(() => {
        const warnBeforePendingSave = (event: BeforeUnloadEvent) => {
            if (!hasPendingUserDataWrites()) return
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', warnBeforePendingSave)
        return () => window.removeEventListener('beforeunload', warnBeforePendingSave)
    }, [])

    useEffect(() => {
        if (!authResolved) return
        if (!userId) {
            clearActiveUserData()
            return
        }

        let isMounted = true
        activateUserData(userId)
            .then(({ needsLegacyImport }) => {
                if (isMounted) {
                    setLegacyImportPending(needsLegacyImport)
                    setDataReadyUserId(userId)
                }
            })
            .catch((error: unknown) => {
                if (isMounted) {
                    setDataSyncError(
                        error instanceof Error ? error.message : 'Unable to load your Supabase data.'
                    )
                    setLegacyImportPending(false)
                    setDataReadyUserId(userId)
                }
            })

        return () => {
            isMounted = false
        }
    }, [authResolved, userId])

    const handleLogOut = async () => {
        try {
            await flushUserDataWrites()
            const { error } = await getSupabaseClient().auth.signOut()
            if (error) {
                setAuthError(error.message)
            }
        } catch (error) {
            setDataSyncError(
                error instanceof Error
                    ? error.message
                    : 'Could not save your data before signing out. Please retry the sync.'
            )
        }
    }

    const handleRetryDataSync = async () => {
        try {
            await retryUserDataSync()
            setDataSyncError(null)
        } catch (error) {
            setDataSyncError(error instanceof Error ? error.message : 'Unable to sync your data.')
        }
    }

    const handleImportLegacyData = () => {
        setIsImportingLegacyData(true)
        try {
            importLegacyUserData()
            setLegacyImportPending(false)
        } catch (error) {
            setDataSyncError(error instanceof Error ? error.message : 'Unable to import browser data.')
        } finally {
            setIsImportingLegacyData(false)
        }
    }

    const handleSkipLegacyImport = () => {
        try {
            skipLegacyUserDataImport()
            setLegacyImportPending(false)
        } catch (error) {
            setDataSyncError(error instanceof Error ? error.message : 'Unable to save your import choice.')
        }
    }

    if (!authResolved || (session && dataReadyUserId !== session.user.id)) {
        return (
            <main className="login-page">
                <p role="status">Loading your saved account data...</p>
            </main>
        )
    }

    if (session && legacyImportPending) {
        return (
            <main className="login-page">
                <section className="login-card" aria-labelledby="data-import-heading">
                    <div className="login-brand"><span>On Track</span></div>
                    <div className="login-intro">
                        <p className="login-eyebrow">ACCOUNT DATA</p>
                        <h1 id="data-import-heading">Import saved browser data?</h1>
                    </div>
                    <p>
                        This browser has data from an earlier version of On Track. Import it into
                        this signed-in account, or start with a clean account. Import only if this
                        browser data belongs to you.
                    </p>
                    <button
                        className="primary-button"
                        type="button"
                        onClick={handleImportLegacyData}
                        disabled={isImportingLegacyData}
                    >
                        {isImportingLegacyData ? 'Importing...' : 'Import my browser data'}
                    </button>
                    <button className="secondary-button" type="button" onClick={handleSkipLegacyImport}>
                        Start with a clean account
                    </button>
                    {dataSyncError && (
                        <p className="login-form-error" role="alert">
                            {dataSyncError}{' '}
                            <button type="button" className="secondary-button" onClick={handleRetryDataSync}>
                                Retry sync
                            </button>
                        </p>
                    )}
                </section>
            </main>
        )
    }

    if (session) {
        return (
            <>
                {dataSyncError && (
                    <p className="login-form-error" role="alert">
                        {dataSyncError}{' '}
                        <button type="button" className="secondary-button" onClick={handleRetryDataSync}>
                            Retry sync
                        </button>
                    </p>
                )}
                <AppStart
                    key={session.user.id}
                    user={session.user}
                    onLogOut={handleLogOut}
                    authError={authError}
                />
            </>
        )
    }

    return (
        <div>
            {authError && <p className="login-form-error" role="alert">{authError}</p>}
            <Login />
        </div>
    )
}

export default App