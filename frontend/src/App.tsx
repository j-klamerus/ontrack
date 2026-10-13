import './App.css'

function App() {

  const sampleGetRequest = async () => {
    const response = await fetch("http://localhost:3000");
    if (!response.ok) {
      throw new Error(`Backend request failed with status ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
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
    </>
  )
}

export default App
