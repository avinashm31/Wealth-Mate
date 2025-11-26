// /api/generate.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const prompt = (req.body && req.body.prompt) || "Analyze finances.";
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  // Try Gemini if key configured
  if (GEMINI_KEY) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: { text: prompt } })
        }
      );

      const text = await response.text();
      if (response.ok) {
        return res.status(200).json({ provider: "gemini", success: true, raw: JSON.parse(text) });
      } else {
        console.error("Gemini responded non-OK:", text);
      }
    } catch (err) {
      console.error("Gemini fetch error:", err);
    }
  }

  // Fallback simulated response (ensures UI never breaks)
  return res.status(200).json({
    provider: "simulated",
    success: false,
    advice: [
      "• Reduce food delivery by 20%",
      "• Pause one subscription this month",
      "• Move ₹500/week to a dedicated savings bucket"
    ],
    note: "Gemini not configured or failed — fallback response returned."
  });
}
