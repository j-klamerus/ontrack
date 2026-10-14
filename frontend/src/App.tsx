import './App.css'
import { useState, type ChangeEvent } from 'react';

function App() {

const [promptText, setPromptText] = useState('');
const [recievedResponse, setRecievedResponse] = useState(false);
const [geminiData, setGeminiData] = useState([]);

const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPromptText(event.target.value);
}

  const sampleGetRequest = async () => {
    const response = await fetch("http://localhost:3000");
    if (!response.ok) {
      throw new Error(`Backend request failed with status ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data;
  }

  const promptGemini = async (prompt: string) => {
    const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Backend request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(data);
    setRecievedResponse(true);
    //this is really bad and stupid, dont do this
    setGeminiData(data.text);
    return data;
  }

  return (
    <>
        <button
          className="counter"
          onClick={() => {
            sampleGetRequest().catch((error: unknown) => {
              console.error("Could not reach the backend:", error);
            });
          }}
        >
          Test Backend
        </button>
        <input type='text' placeholder='enter a prompt to send to gemini' value={promptText} onChange={handleInputChange}></input>
        <button
          onClick={() => {
            promptGemini(promptText).catch((error: unknown) => {
              console.error("Could not reach the backend:", error);
            });
          }}
        >
          Submit Prompt
        </button>

        {
          recievedResponse ? <p>{geminiData}</p> : <p>Response:</p>
        }
    </>
  )
}

export default App
