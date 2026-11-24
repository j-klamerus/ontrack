import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
const GMAIL_OAUTH_SESSION_KEY = 'ontrack-gmail-oauth-session'
const GMAIL_OAUTH_SESSION_MAX_AGE_MS = 10 * 60 * 1000

type TemporaryAuthSession = {
  accessToken: string
  refreshToken: string
  createdAt: number
}

const isTemporaryAuthSession = (value: unknown): value is TemporaryAuthSession =>
  typeof value === 'object' &&
  value !== null &&
  'accessToken' in value &&
  typeof value.accessToken === 'string' &&
  'refreshToken' in value &&
  typeof value.refreshToken === 'string' &&
  'createdAt' in value &&
  typeof value.createdAt === 'number'

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Require sign-in after each page load instead of restoring a prior session.
        persistSession: false
      }
    })
  : null

export const isSupabaseConfigured = supabase !== null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env, then restart Vite.'
    )
  }

  return supabase
}

/** Keeps the current sign-in only long enough to survive Gmail's full-page OAuth redirect. */
export async function preserveSessionForGmailOAuthRedirect(): Promise<void> {
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Sign in before connecting Gmail.')

  sessionStorage.setItem(GMAIL_OAUTH_SESSION_KEY, JSON.stringify({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    createdAt: Date.now()
  }))
}

/** Restores a temporary sign-in only on return from Gmail OAuth, then removes its snapshot. */
export async function restoreSessionAfterGmailOAuthRedirect(): Promise<void> {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('gmail')) return

  const savedSession = sessionStorage.getItem(GMAIL_OAUTH_SESSION_KEY)
  sessionStorage.removeItem(GMAIL_OAUTH_SESSION_KEY)
  url.searchParams.delete('gmail')
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`
  )

  if (!savedSession) {
    throw new Error('Could not restore your On Track sign-in after Gmail authorization. Please sign in again.')
  }

  let parsedSession: unknown
  try {
    parsedSession = JSON.parse(savedSession)
  } catch {
    throw new Error('Temporary On Track sign-in data was invalid. Please sign in again.')
  }
  if (!isTemporaryAuthSession(parsedSession)) {
    throw new Error('Temporary On Track sign-in data was invalid. Please sign in again.')
  }

  const sessionAge = Date.now() - parsedSession.createdAt
  if (sessionAge < 0 || sessionAge > GMAIL_OAUTH_SESSION_MAX_AGE_MS) {
    throw new Error('Your On Track sign-in expired during Gmail authorization. Please sign in again.')
  }

  const { error } = await getSupabaseClient().auth.setSession({
    access_token: parsedSession.accessToken,
    refresh_token: parsedSession.refreshToken
  })
  if (error) {
    throw new Error(`Could not restore your On Track sign-in after Gmail authorization: ${error.message}`)
  }
}
