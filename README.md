# How to run the project:

## Requirements:
- Nodejs
	- https://nodejs.org/en/download
- Git
	- https://git-scm.com/install/
- Gemini API key
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

### Run the Frontend Linter

From the project root, run:

```sh
cd frontend
npm run lint
```

This runs ESLint on the frontend code and can help catch common issues while developing. The backend does not currently have a lint script.

### Demo Email Rules

The Inbox rule demo uses the backend endpoint `POST /api/email-rules/evaluate` when you click **Scan emails**. It sends the bundled sample emails from `frontend/src/data/demoEmails.json` and your locally saved category, priority, and spam settings to the backend; it does not fetch real Gmail messages. The Gmail connection card is a placeholder, and the backend's separate OAuth prototype routes are not used by the Inbox scan.

Before scanning, the Inbox doesn't show rule-derived categories, labels, priorities, or spam matches. After scanning, the backend returns matching labels and sorts emails by the first matching category rule. Rule order in Settings controls group order, unmatched messages appear under `Other`, and messages within each group are newest-first. Priority rules are checked separately: when multiple rules match, High takes precedence over Medium, then Low; saved rule order breaks ties. Emails with no matching priority rule stay unprioritized. The Dashboard uses matching saved scan results for its High Priority total; before the first scan, the total is shown as unavailable and suggested-reply emails have no rule-derived priorities. Use **Clear categories & priorities** in the Inbox to remove scan-derived category labels and priority results without removing spam detections; the dashboard count also reflects the cleared priorities until you scan again. The Inbox saves its scan results, clear state, search and filters, selected email, and sort choice in this browser, so they survive page changes and reloads. Saved scan results are reused only while the matching email content and rules are unchanged. Spam detection checks enabled content rules and exact blocked sender addresses. A detected match is shown in the Inbox and included in the **Spam** filter, but isn't moved automatically; use **Move to Spam** when you want to move a message into the demo spam queue. Signals and the category, priority, and spam results are for display in the demo only; the app does not modify or label messages in Gmail.

Settings includes a Baseline Categories rule set for Assignment, Exam, Meeting, Appointment, Deadline, and Other, plus an optional Campus & Study Extras set with academic and campus-service rules. The baseline now covers common campus events and singular “quiz” mentions in the expanded sample inbox. There's also a Baseline Priorities set for common urgency, school tasks, and general notices, plus a Student-focused priority refinements set with more specific student actions and explicit weekday deadlines. Within each priority level, refinements are evaluated before baseline rules; priority level takes precedence overall (High, then Medium, then Low). Load both priority sets to use them together. A Baseline spam rules set looks for common account-pressure and sensitive-information requests. Each set can be loaded or unloaded as a group. Individual rules can be enabled, disabled, or deleted, and custom rules are preserved when unloading a set. You can also add exact sender email addresses to the blocked-senders list and remove them individually. These settings are saved in your browser.

For category, priority, and spam regex rules, Settings includes a guide and a phrase builder. Enter comma or line-separated phrases to create a pattern that matches any of them; the builder escapes regex symbols and can add whole-word boundaries. Regex matching ignores capitalization. Spam patterns are simple heuristics, so review flagged messages before moving them.

The frontend expects the backend at `http://localhost:3000`. To use another backend URL, set `VITE_API_BASE_URL` in the frontend environment.

### Test the Backend

With the backend running, open `http://localhost:3000/` in a browser or run:

```powershell
Invoke-RestMethod http://localhost:3000/
```

The response should contain `message: "Hello World!"`. This checks that the backend is reachable; the demo email scan is tested separately below.

### Verify the Demo Email Scan

1. Start both the frontend and backend using the steps above.
2. In the app, enter a valid email address and any password on the demo sign-in screen. Sign-in is simulated; no account is created or checked.
3. Open **Settings** and load **Baseline Categories**, **Baseline Priorities**, **Student-focused priority refinements**, and **Baseline spam rules**. You can also load **Campus & Study Extras**, add a spam rule, or add an exact sender address to **Blocked senders**.
4. Open **Inbox** and click **Scan emails**. The emails should be grouped and labeled by the category rules, get a priority when they match a priority rule, and show **Spam detected** when a spam rule or blocked sender matches. Emails without a priority match stay unprioritized. Detected spam isn't moved automatically; use **Move to Spam** to put it in the demo spam queue.
5. To try the scan again after changing rules, return to **Inbox** and click **Rescan emails**.

The scan uses the bundled sample emails and requires the backend to be running. It does not connect to Gmail.

### LEGACY: Gemini Setup for the Separate `small-demo` Branch

> These instructions are for the separate `small-demo` branch only. The current OnTrack app does not require a Gemini API key.

To switch to the small-demo branch, navigate back to the root directory of the project (the `ontrack` folder) and enter `git switch small-demo`. You will also need to run `npm install` in both the frontend and backend directories because that branch uses additional libraries. Stop the frontend and backend servers before installing dependencies again by pressing `Ctrl+C` in each terminal.

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



