import { GoogleGenAI } from "@google/genai";
import express, { type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())

const apiKey = process.env.API_KEY;

if(!apiKey) {
    throw new Error("missing api key env variable");
}

const ai = new GoogleGenAI({ apiKey });

interface GenerateRequestBody {
  prompt: string;
}

//test api route
// POST endpoint to generate text content
app.post("/api/generate", async (req: Request<{}, {}, GenerateRequestBody>, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // Call the Gemini model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite", 
      contents: prompt,
    });

    return res.json({ text: response.text });
  } catch (error) {
    console.error("Error communicating with Gemini API:", error);
    return res.status(500).json({ error: "Failed to generate content." });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})