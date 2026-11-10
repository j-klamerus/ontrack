import express from "express";
import cors from "cors";
import "dotenv/config"

import { google, type gmail_v1 } from "googleapis";
import {
  evaluateEmailRules,
  type EmailRule,
  type RuleEvaluationEmail
} from "./emailRuleEvaluator.js";

const app = express()
const port = process.env.PORT || 3000;

//get env vars
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI,
  SESSION_SECRET,
} = process.env;


/*const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URL
);*/

const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
})

app.get("/testAuth", (req, res) => {
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope:scopes
  });
  res.send(`<a href="${url}"> Auth with Google </a>`)
})

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  if (typeof code !== 'string') {
    res.status(400).send('Missing authorization code.')
    return
  }

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  await readEmails(oauth2, res);
})

app.post('/api/email-rules/evaluate', (req, res) => {
  const body: unknown = req.body

  if (!isRecord(body) || !Array.isArray(body.emails) || !Array.isArray(body.rules)) {
    res.status(400).json({ error: 'Request must include email and rule arrays.' })
    return
  }

  if (body.emails.length > 100 || body.rules.length > 50) {
    res.status(400).json({ error: 'Evaluation supports up to 100 emails and 50 rules.' })
    return
  }

  if (!body.emails.every(isRuleEvaluationEmail) || !body.rules.every(isEmailRule)) {
    res.status(400).json({ error: 'Email or rule data has an invalid format.' })
    return
  }

  try {
    const results = evaluateEmailRules(body.emails, body.rules)
    res.json({ results })
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unable to evaluate email rules.'
    })
  }
})

//should define types insead of using any, but this works for now
async function readEmails(auth: InstanceType<typeof google.auth.OAuth2>, res: express.Response) {
    const gmail = google.gmail({ version: 'v1', auth });
    const response = await gmail.users.messages.list({
        userId:'me',
        maxResults:30
    });

    const messages = response.data.messages;

    if(!messages){
        res.send('There are no messages');
        return;
    }
    
    const mails = await Promise.all(messages.map(async (message) => `<li>${await getEmail(message.id, gmail)}</li>`))
    
    res.send(`<h2>Messages</h2><ul>${mails.join('')}</ul>`)
    return;
}

async function getEmail(emailId: string | null | undefined, gmail: gmail_v1.Gmail): Promise<string> {
    if (!emailId) {
      throw new Error('Gmail returned a message without an ID.')
    }

    const response = await gmail.users.messages.get({ id: emailId, userId: 'me' });
    const email = response.data;
    
    const headers = email.payload?.headers ?? []
    const subject = headers.find((header) => header.name?.toLowerCase() === 'subject')?.value ?? '(no subject)'
    const from = headers.find((header) => header.name?.toLowerCase() === 'from')?.value ?? '(unknown sender)'

    return 'From:<b>'+from+'</b>\n'+subject;
}

function generateOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

const oauth2 = generateOAuthClient();

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEmailRule = (value: unknown): value is EmailRule =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.length > 0 &&
  value.id.length <= 100 &&
  typeof value.enabled === 'boolean' &&
  (value.field === 'sender' || value.field === 'email' || value.field === 'subject' || value.field === 'body') &&
  (value.operator === 'contains' || value.operator === 'regex') &&
  typeof value.pattern === 'string' &&
  value.pattern.trim().length > 0 &&
  value.pattern.length <= 200 &&
  typeof value.label === 'string' &&
  value.label.trim().length > 0 &&
  value.label.length <= 60

const isRuleEvaluationEmail = (value: unknown): value is RuleEvaluationEmail =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  Number.isSafeInteger(value.id) &&
  typeof value.sender === 'string' &&
  value.sender.length <= 500 &&
  typeof value.email === 'string' &&
  value.email.length <= 500 &&
  typeof value.subject === 'string' &&
  value.subject.length <= 1000 &&
  typeof value.body === 'string' &&
  value.body.length <= 20000 &&
  typeof value.date === 'string' &&
  value.date.length <= 100

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})