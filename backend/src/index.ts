import express from "express";
import cors from "cors";
import "dotenv/config"

import { google } from "googleapis";

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

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

app.get("/testAuth", (req, res) => {
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope:scopes
  });
  res.send(`<a href="${url}"> Auth with Google </a>`)
})

app.get("/auth/google/callback", async (req, res) => {
  const {code} = req.query;
  const {tokens} = await oauth2.getToken(code);
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
    
    const mails = await Promise.all(messages.map(async(message)=>`<li>${await getEmail(message.id,gmail)}</li>`))
    
    res.send(`<h2>Messages</h2><ul>${mails.join('')}</ul>`)
    return;
}

//should define types insead of using any, but this works for now
async function getEmail(emailId : any,gmail: any){
    const response = await gmail.users.messages.get({id:emailId,userId:'me'});
    const email = response.data;
    
    const subject = email.payload.headers.find(e=>e.name == 'Subject').value;
    const from = email.payload.headers.find(e=>e.name == 'From').value;

    return 'From:<b>'+from+'</b>\n'+subject;
}

function generateOAuthClient() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

const oauth2 = generateOAuthClient();