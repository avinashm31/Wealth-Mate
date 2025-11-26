import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userPrompt = req.body?.prompt || "Analyze my finances.";

  const apiKey = process.env.GEMINI_API_KEY;

  // If Gemini API key exists → try real call
  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: { text: userPrompt } })
        }
      );

      const text = await response.text();

      if (response.ok) {
        return res.status(200).json({
          provider: "gemini",
          success: true,
          raw: JSON.parse(text)
        });
      } else {
        console.error("Gemini error:", text);
      }
    } catch (err) {
      console.error("Gemini fetch failed:", err);
    }
  }

  // Fallback: simulated AI so your app always works
  return res.status(200).json({
    provider: "simulated",
    success: false,
    advice: [
      "• Reduce food delivery expenses by 20%",
      "• Limit discretionary shopping to ₹1500/month",
      "• Move ₹500/week to your savings goal"
    ],
    note: "Gemini unavailable; this is a safe simulated response."
  });
}
