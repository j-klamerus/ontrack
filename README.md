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
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
~~~
Restart Vite after changing this file. In Supabase, enable the Email provider for password sign-in and account creation. To use "Continue with Google", enable the Google provider under Authentication > Sign In / Providers, add the Supabase callback URL shown there to your Google OAuth client's authorized redirect URIs, and add your local and deployed frontend origins to Supabase's allowed redirect URLs. Gmail API access is separate from Google sign-in and requires its own Gmail authorization flow.

The dashboard and Student Profile show details from the signed-in account. Profile fields are read-only; email/password accounts do not provide a name during registration, so the dashboard uses the email address when no name is available.


### Setup the Backend
1. Basically the same process as the frontend but you will need to navigate to the backend folder instead of the frontend. I like to have a split terminal running so I can see both at the same time without having to click back and forth, you can do this by pressing "Ctrl + Shift + 5" while your cursor is inside the existing terminal.
2. The previous step opened your split terminal in the same directory as the frontend but we need to be in the backend, so from the terminal enter "cd .." to jump backward in the file tree then enter "cd backend" to change to the backend directory.
3. Once you have navigated to the backend you can enter "npm install" and "npm run dev" same as before.
4. If everything worked properly you should see something similar to: 
~~~
> backend@1.0.0 dev
> tsx watch src/index.ts

◇ injected env (2) from .env
Example app listening on port 3000
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

After connecting Google Calendar in Settings, choose a **Primary calendar for On Track**. The Calendar page displays that calendar and creates new events there; a read-only calendar can be viewed but cannot receive new events. The choice is stored per On Track account in `backend/.ontrack-data/calendar-selections` and does not change Google's own primary calendar. Run the backend from the `backend` directory so it uses the same data location each time. This local prototype is intended for a single backend process; backing up or moving the server requires preserving that directory. Existing per-account browser selections migrate on first use; earlier shared browser selections are not carried over. If the saved calendar is no longer available, choose another in Settings.

Google events are fetched live for the displayed month or week, alongside On Track's local events; they are not imported as independent copies. Navigate to another range or use **Refresh Google Calendar** to fetch changes made in Google. A connection is required to view them. All-day Google events can be viewed and deleted here, but must be edited in Google Calendar.

To copy On Track calendar events to the selected writable Google Calendar, use **Sync to Google** on the Calendar page and select the events to add. The list includes demo events and confirmed suggestions; commitments are not included. Copies are one hour long. Sync is add-only: repeated syncs do not duplicate or update an event, and subsequent edits or deletions are not propagated. Google copies are shown separately from the original On Track events. Sync records are stored per account and calendar under `backend/.ontrack-data/calendar-sync`; preserve this directory along with calendar selections when moving or backing up the backend. On Track's demo events use dates relative to the current day, and locally added events are currently session-only.

Calendar selection, category edits, and preference changes are applied with **Save Changes**. You will be warned before leaving Settings with unsaved changes. Reset to Defaults opens a review where you can choose which preferences, calendar selection, and individual custom categories to reset; applying those resets takes effect immediately. Removing a custom category moves local events and commitments using it to Other. It does not modify categories stored in Google Calendar events.

#### Calendar setup and behavior

- Enable the Google Calendar API for the Google Cloud project containing the calendar OAuth client. The app requests `calendar.calendarlist.readonly` to list calendars and `calendar.events` to view and manage events. If the OAuth app is in testing mode, the Google account must be an authorized test user. Google sign-in to On Track and connecting Google Calendar are separate authorization steps.
- The frontend contacts `http://localhost:3000` by default. If the backend is elsewhere, set `VITE_BACKEND_URL` in `frontend/.env` to its origin and restart the frontend. Set `FRONTEND_ORIGIN` in `backend/.env` to the frontend origin, and register the exact backend callback URL in Google Cloud.
- In Settings, connect Google Calendar, select a calendar, and click **Save Changes**. With no saved selection, On Track chooses a default from the available calendars, preferring writable calendars. A saved selection that is no longer available must be replaced explicitly. Resetting the selection does not disconnect Google; disconnecting removes only the running backend's connection, not the Google account grant.
- The month grid requests six weeks and the week view requests the displayed week. The backend expands recurring events and converts timed events to the browser's time zone. Google all-day dates remain calendar dates; multi-day events appear on their occupied dates. Google changes are fetched on range changes or with **Refresh Google Calendar**, not continuously.
- New calendar events added while Google is connected are created on the selected writable calendar; without a connection, new local events exist only in the current Calendar page state. Confirmed calendar suggestions are stored in browser storage, separately from Google. Local event edits and deletions are not generally persisted across reopening the page; category overrides are stored in the browser.
- **Sync to Google** lets you select local calendar events, including demo events, and creates independent one-hour Google copies. It does not copy commitments. The original and the Google copy appear separately; later changes to either do not update the other. The backend retains the sync record even if the Google copy is deleted, so selecting that same local event again for the same calendar reports it as already synced rather than recreating it.

#### Calendar implementation and testing

The browser's [Calendar page](./frontend/src/pages/Calendar.tsx) combines local planner data with live Google results. Its [Google Calendar client](./frontend/src/services/googleCalendar.ts) sends the current Supabase bearer token to the backend; Google credentials are not sent to the frontend. The backend [calendar router](./backend/src/googleCalendar.ts) verifies the user, manages Google OAuth, lists and modifies events, and delegates event conversion to [calendarEvent.ts](./backend/src/calendarEvent.ts).

The backend stores calendar choices and add-only sync records in separate directories under `backend/.ontrack-data`. These files are local to the backend machine and are not a shared database; the in-process write queues assume a single backend process. Sync record filenames are derived from hashed user and calendar IDs; each record maps a hashed Google event ID to its local source ID. Retain both directories when moving the backend; Google OAuth credentials still need reconnection after a restart.

Run the calendar-related tests from the respective directories:

```powershell
# From backend
npx tsx --test tests\calendar.test.mjs tests\calendar-selection-api.test.mjs

# From frontend
node --test tests\google-calendar-selection.test.mjs
```

These tests use mocked Google and Supabase responses; they do not verify a live Google connection. For a live check, connect an account, select a writable calendar, sync a chosen event, and confirm the event in that same calendar in Google.

### Test Everything is working Properly

At this point everything should be setup properly in order to run the app. Follow these steps to make sure its working as expected:
1. Right click on the webpage that opened with the frontend and click the "inspect" option.
2. With the inspect element window open click the "console" tab.
3. Click the big purple "Test Backend" button on the webpage.

If everything is working properly within a few seconds you should see an object appear in the console that contains a message that reads "Hello World!"

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



