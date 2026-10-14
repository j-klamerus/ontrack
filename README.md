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




