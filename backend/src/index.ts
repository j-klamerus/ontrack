import cors from 'cors'
import 'dotenv/config'
import express, { type NextFunction, type Request, type Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { randomUUID } from 'node:crypto'
import { analyzeEmails } from './services/gemini.js'
import { fetchRecentEmails } from './services/gmail.js'
import googleCalendarRouter from './googleCalendar.js'

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  FRONTEND_URL = 'http://localhost:5173',
  PORT = '3000',
} = process.env

const requiredEnvironment = {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
}

for (const [name, value] of Object.entries(requiredEnvironment)) {
  if (!value) {
    throw new Error(`Missing required backend environment variable: ${name}`)
  }
}

const app = express()
const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
const googleScopes = ['https://www.googleapis.com/auth/gmail.readonly']
const oauthPendingLifetimeMs = 10 * 60 * 1000
const port = Number(PORT)

// Gmail connections and pending OAuth state are process-local for this first version.
const pendingAuthorizations = new Map<string, { userId: string; expiresAt: number }>()
const gmailRefreshTokens = new Map<string, string>()

app.use(cors({ origin: FRONTEND_URL }))
app.use(express.json({ limit: '1mb' }))
app.use(googleCalendarRouter)

type AuthenticatedRequest = Request & { userId?: string }

/** Verify the Supabase bearer token and attach the verified user ID to the request. */
async function requireSignedInUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const bearerToken = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!bearerToken) {
    res.status(401).json({ error: 'Sign in before connecting Gmail or analyzing email.' })
    return
  }

  const { data, error } = await supabase.auth.getUser(bearerToken)
  if (error || !data.user) {
    res.status(401).json({ error: 'Your sign-in session is invalid or expired.' })
    return
  }

  req.userId = data.user.id
  next()
}

app.get('/', (_req, res) => {
  res.json({ message: 'On Track backend is running.' })
})

app.get('/api/gmail/status', requireSignedInUser, (req: AuthenticatedRequest, res) => {
  res.json({ connected: Boolean(req.userId && gmailRefreshTokens.has(req.userId)) })
})

/** Start Google consent after proving which On Track user initiated it. */
app.get('/auth/google/start', requireSignedInUser, (req: AuthenticatedRequest, res) => {
  const userId = req.userId
  if (!userId) {
    res.status(401).json({ error: 'Sign in before connecting Gmail.' })
    return
  }

  const now = Date.now()
  for (const [state, pending] of pendingAuthorizations) {
    if (pending.expiresAt <= now) pendingAuthorizations.delete(state)
  }

  const state = randomUUID()
  pendingAuthorizations.set(state, { userId, expiresAt: now + oauthPendingLifetimeMs })

  const oauthClient = createOAuthClient()
  const authorizationUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: googleScopes,
    state,
  })

  res.json({ authorizationUrl })
})

/** Consume a single-use state before exchanging the Gmail OAuth code. */
app.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query
  if (error) {
    res.redirect(`${FRONTEND_URL}/?gmail=denied`)
    return
  }
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('Google did not return the expected authorization parameters.')
    return
  }

  const pending = pendingAuthorizations.get(state)
  pendingAuthorizations.delete(state)
  if (!pending || pending.expiresAt <= Date.now()) {
    res.status(400).send('This Gmail authorization request expired. Return to On Track and try again.')
    return
  }

  try {
    const oauthClient = createOAuthClient()
    const { tokens } = await oauthClient.getToken(code)
    const refreshToken = tokens.refresh_token ?? gmailRefreshTokens.get(pending.userId)
    if (!refreshToken) {
      res.status(400).send('Google did not provide offline access. Please reconnect and grant access.')
      return
    }

    gmailRefreshTokens.set(pending.userId, refreshToken)
    res.redirect(`${FRONTEND_URL}/?gmail=connected`)
  } catch (error) {
    console.error('Google OAuth code exchange failed:', error)
    res.status(502).send('Could not complete Gmail authorization. Please try again.')
  }
})

/** Fetch a bounded Gmail batch and return Gemini's structured analysis. */
app.post('/api/emails/analyze', requireSignedInUser, async (req: AuthenticatedRequest, res) => {
  const userId = req.userId
  if (!userId) {
    res.status(401).json({ error: 'Sign in before analyzing email.' })
    return
  }

  const refreshToken = gmailRefreshTokens.get(userId)
  if (!refreshToken) {
    res.status(409).json({ error: 'Gmail is not connected. Connect Gmail in Settings first.' })
    return
  }

  const requestedLimit = req.body?.maxResults
  const maxResults = requestedLimit === undefined ? 10 : Number(requestedLimit)
  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 20) {
    res.status(400).json({ error: 'maxResults must be an integer from 1 to 20.' })
    return
  }

  try {
    const gmail = createGmailClient(refreshToken)
    const emails = await fetchRecentEmails(gmail, maxResults)
    const analyses = await analyzeEmails(emails)
    const analysisById = new Map(analyses.map((analysis) => [analysis.id, analysis]))
    res.json({
      emails: emails.map((email) => ({ ...email, ...analysisById.get(email.id) })),
    })
  } catch (error) {
    console.error('Email analysis failed:', error)
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Could not fetch and analyze Gmail messages.',
    })
  }
})

function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI!,
  )
}

function createGmailClient(refreshToken: string) {
  const auth = createOAuthClient()
  auth.setCredentials({ refresh_token: refreshToken })
  return google.gmail({ version: 'v1', auth })
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error'
  console.error('Backend request failed:', message)
  res.status(500).json({
    error: 'The backend could not complete the request. Check the backend terminal for details.',
  })
})

app.listen(port, () => {
  console.log(`On Track backend listening on port ${PORT}`)
})
