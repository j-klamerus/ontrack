# STILL TODO
- As of now users must manually reconnect their gmail after the server restarts. Gmail/Google credentials need to be stored and linked to each users login on supabase. This seems pretty complicated so probably get some help from Copilot or Claude.
- The backend now handles all the necessary api calls to get the emails and gemini response, but it only dumps it to the screen. Frontend needs work to actually display the gemini responses the way we want them shown.
- The gemini responses need to be saved in the database and there needs to be some kind of logic implemented that checks if a given email has already been analyzed. If the email is found to have already been analyzed the stored result should be used instead of a new gemini call.

# How to run the project:

## Requirements:
- Nodejs
	- https://nodejs.org/en/download
- Git
	- https://git-scm.com/install/
- Gemini API Key
	- https://ai.google.dev/gemini-api/docs/api-key

## Steps:
### Clone the project:
1. Create a folder on your system where you want the project to be stored.
2. Open that folder in VSCode or whatever editor you want to use.
3. Open a terminal in that directory within vscode, the shortcut for windows should be Ctrl + `
4. Enter "git clone https://github.com/j-klamerus/ontrack.git" in the terminal
5. Enter "cd ontrack" into the termial to change directories into the one that was just created
6. If everything worked properly you should see a folder called ontrack and the project files within this folder.

### Setup the Frontend
1. You will need to navigate to the frontend folder from the terminal. The easiest way to do this is probably to right click on the frontend folder within vscode and click "Open in Integrated Terminal".
2. Type "npm install" in the terminal window that you just opened. This will install necessary dependencies for the project.
3. Type "npm run dev" in the same terminal window. This will start the development server and it should give you a url in the terminal that opens to the frontend running within your browser:
~~~
> react-ts@0.0.0 dev
> vite


  VITE v8.3.4  ready in 324 ms

  ➜  Local:   http://localhost:5173/ <----- CTRL+CLICK HERE
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
~~~

### Set Up Login
The frontend login uses Supabase Auth. Create `frontend/.env` (in the frontend folder, not `frontend/src/`) with the Supabase project URL and publishable/anon key:
~~~
VITE_SUPABASE_URL=https://amogopewpbsdlndfacbq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_p4uU0mVKkW3mW_BTPhXqgw_-25u3UAG
~~~
Restart Vite after changing this file. In Supabase, enable the Email provider for password sign-in and account creation. To use "Continue with Google", enable the Google provider under Authentication > Sign In / Providers, add the Supabase callback URL shown there to your Google OAuth client's authorized redirect URIs, and add your local and deployed frontend origins to Supabase's allowed redirect URLs. Gmail API access is separate from Google sign-in and requires its own Gmail authorization flow.

The dashboard and Student Profile show details from the signed-in account. Profile fields are read-only; email/password accounts do not provide a name during registration, so the dashboard uses the email address when no name is available.


### Setup the Backend
1. Basically the same process as the frontend but you will need to navigate to the backend folder instead of the frontend. I like to have a split terminal running so I can see both at the same time without having to click back and forth, you can do this by pressing "Ctrl + Shift + 5" while your cursor is inside the existing terminal.
2. The previous step opened your split terminal in the same directory as the frontend but we need to be in the backend, so from the terminal enter "cd .." to jump backward in the file tree then enter "cd backend" to change to the backend directory.
3. Once you have navigated to the backend you can enter "npm install" and "npm run dev" same as before.
4. Copy `backend/.env.example` to `backend/.env` and fill in the values described below. Never commit `backend/.env` or place these secrets in frontend variables.
5. If everything worked properly you should see something similar to:
~~~
> backend@1.0.0 dev
> tsx watch src/index.ts

◇ injected env from .env
On Track backend listening on port 3000
~~~
appear in your terminal.

For the local Google Calendar prototype, add the following settings to `backend/.env`. Copy the Supabase URL and publishable/anon key from `frontend/.env`; do not use a Supabase service-role key:
~~~
GOOGLE_CALENDAR_CLIENT_ID=your-calendar-oauth-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-calendar-oauth-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/auth/google/calendar/callback
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-publishable-key
FRONTEND_ORIGIN=http://localhost:5173
PORT=3000
~~~
The OAuth client must be a Web application with the redirect URI above. The prototype keeps Google tokens in backend memory, so reconnect after restarting the backend. `backend/.env` is ignored by Git; never commit or share its secrets.

#### Google Calendar setup
1. In Google Cloud, enable the **Google Calendar API** for the project that contains the OAuth client. If the OAuth app is in testing mode, add your Google account as a test user.
2. Register the exact redirect URI above on the OAuth client. The app requests the `calendar.calendarlist.readonly` and `calendar.events` scopes.
3. The frontend contacts `http://localhost:3000` by default. If the backend runs elsewhere, set `VITE_BACKEND_URL` in `frontend/.env` and `FRONTEND_ORIGIN` in `backend/.env`, then restart both.
4. Start the backend from the `backend` directory (calendar choices and sync records are saved in `backend/.ontrack-data`). In Settings, click **Connect Google Calendar**, choose a **Primary calendar for On Track**, and click **Save Changes**.

Reconnect after restarting the backend.

Calendar tests use mocked Google and Supabase responses, they do not verify a live Google connection (test live connection with actual Google account with calendar and events):
- `npx tsx --test tests\calendar.test.mjs tests\calendar-selection-api.test.mjs` (from `backend`): calendar choices are saved per user and resets are respected; timed events convert to the user's time zone while all-day dates are kept; sync records avoid duplicates; and the API authenticates users, saves selections, and returns normalized Google events.
- `node --test tests\google-calendar-selection.test.mjs` (from `frontend`): an older browser calendar choice migrates to the backend once without overwriting a backend choice or reset, and the default calendar is chosen correctly.

### Test Everything is working Properly

#### Where to read the code

- `backend/src/index.ts` defines HTTP routes, verifies the Supabase bearer session, starts/completes Google OAuth, and connects the services.
- `backend/src/services/gmail.ts` lists Gmail message IDs, fetches full message resources, decodes MIME bodies, and normalizes message metadata.
- `backend/src/services/gemini.ts` defines the analysis data shape, Gemini JSON schema and prompt, calls `generateContent`, then validates the response.
- `frontend/src/services/gmailAnalysis.ts` attaches the signed-in Supabase access token to backend requests and validates the response shape.
- `frontend/src/pages/Settings.tsx` starts Gmail consent; `frontend/src/pages/Inbox.tsx` requests analyses and displays the returned data.

### API Keys
Note: the code that exists on the main branch doesn't utilize the gemini api so this part is only if you want to get the demo app running. To switch to the main branch navigate back to the root directory of the project i.e. the folder "ontrack" and enter "git switch small-demo" to change branches from the main branch to the demo branch. You will also need to "npm install" again in both the frontend and backend directories since the code on the small-demo branch uses additional libraries that weren't installed along with the code on the main branch. Make sure to stop the frontend and backend server before attempting to npm install again, you can stop them by clicking on the terminal window and pressing "CTRL+C".

Another Note: After stopping the frontend and backend servers you will need to restart them again if you want to view the app again. You can do this the same as before by entering "npm run dev" while within the corresponding directory.

1. Navigate to https://ai.google.dev/gemini-api/docs/api-key and click the "Create or view a Gemini API key" button. For some reason gemini is blocked on the umich school emails so you will need to switch to a different account in order to get a key.
2. Click the "Create a Key" button and name it something like capstone-test or capstone-demo.
3. Navigate back to VSCode and check within the backend folder for a file called ".env" it shouldn't exist so right click on the backend folder and select "New file...", name the new file ".env".
4. Select the .env file from the file tree and set it up as so:
~~~
API_KEY=copy paste your api key from the gemini website here
PORT=3000
~~~
Note: this has to be exact otherwise the backend will not work properly.

This is everything you need to get the code from the small-demo app running. To test it just enter something in the text box on the web page and click submit prompt, if everything is working correctly it should show the result of the prompt just under the submit prompt button as well as in the console.

### Other Notes that aren't really relevant yet but will be soon:
- When you first attempt to make changes and push them to the github repo its going to ask you to authenticate with your github if you've never done it before, so watch out for that.



