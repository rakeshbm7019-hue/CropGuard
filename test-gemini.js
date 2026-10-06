import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Find 2 fertilizer shops in Dharwad.",
      config: { tools: [{ googleSearch: {} }] }
    });
    console.log("SUCCESS:", res.text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
run();
