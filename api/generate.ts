// api/generate.ts
// Vercel serverless function: forwards prompts to Gemini (server-side)
// Add environment variables in Vercel: GEMINI_API_KEY and GEMINI_API_URL

import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { prompt, model = 'gemini-3.0', maxTokens = 250 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = process.env.GEMINI_API_URL; // e.g. https://generativelanguage.googleapis.com/v1/models/gemini-3.0:generateContent

    if (!apiKey || !apiUrl) return res.status(500).json({ error: 'AI not configured' });

    // Generic provider payload — adapt if you need a specific schema
    const body = {
      prompt,
      max_tokens: maxTokens,
      model
    };

    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    const json = await r.json();
    if (!r.ok) {
      console.error('AI provider error', json);
      return res.status(r.status).json({ error: 'AI provider error', details: json });
    }

    return res.status(200).json(json);
  } catch (err: any) {
    console.error('generate error', err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}
