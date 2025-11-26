// src/lib/geminiClient.ts
import { ENV } from "../config/env";

export async function askGemini(prompt: string) {
  const res = await fetch(`${ENV.GEMINI_API_URL}?key=${ENV.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: prompt }] }
      ]
    })
  });

  const json = await res.json();
  return json;
}
