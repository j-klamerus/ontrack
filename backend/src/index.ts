import express from "express";
import cors from "cors";
import "dotenv/config"

import { google } from "googleapis";
import googleCalendarRouter from "./googleCalendar.js";

const app = express()
const port = process.env.PORT || 3000;
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || 'http://localhost:5173'

//get env vars
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = process.env;

const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

app.use(cors({ origin: frontendOrigin }))
app.use(express.json())
// Calendar OAuth and routes are separate from the legacy Gmail OAuth flow below.
app.use(googleCalendarRouter)

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
  const code = req.query.code;
  if (typeof code !== 'string') {
    res.status(400).send('Google did not return an authorization code.')
    return
  }

  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);
  readEmails(oauth2,res);
})

//should define types insead of using any, but this works for now
async function readEmails(auth : any, res: express.Response){
    const gmail = google.gmail({version:'v1',auth});
    const response = await gmail.users.messages.list({
        userId:'me',
        maxResults:30
    });

    const messages = response.data.messages;

    if(!messages){
        res.send('There are no messages');
        return;
    }
    
    const mails = await Promise.all(
        messages
            .filter((message) => typeof message.id === 'string')
            .map(async (message) => `<li>${await getEmail(message.id, gmail)}</li>`)
    )
    
    res.send(`<h2>Messages</h2><ul>${mails.join('')}</ul>`)
    return;
}

//should define types insead of using any, but this works for now
async function getEmail(emailId : any,gmail: any){
    const response = await gmail.users.messages.get({id:emailId,userId:'me'});
    const email = response.data;
    
    const headers = email.payload?.headers ?? [];
    const subject = headers.find((header: { name?: string | null }) => header.name === 'Subject')?.value ?? '';
    const from = headers.find((header: { name?: string | null }) => header.name === 'From')?.value ?? '';

    return 'From:<b>'+from+'</b>\n'+subject;
}

function generateOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

const oauth2 = generateOAuthClient();

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error'
  console.error('Backend request failed:', message)
  res.status(500).json({ error: 'The backend could not complete the request. Check the backend terminal for details.' })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})