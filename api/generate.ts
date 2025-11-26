// api/generate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';

const API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent';
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!SERVICE_ACCOUNT_JSON) {
      return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT environment variable' });
    }

    // Accept only POST
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });

    // Create GoogleAuth with credentials from the env var
    const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    // Get a client and access token
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const accessToken = (typeof accessTokenResponse === 'string') ? accessTokenResponse : accessTokenResponse?.token;
    if (!accessToken) return res.status(500).json({ error: 'Failed to obtain access token' });

    // Build the request body — adjust if you use a different model API shape
    // (Some generative endpoints expect "input_text" or "messages"; check the model doc for exact schema.)
    const body = {
      // For many current Generative Language endpoints, "content" with parts/text works.
      // If your model expects a different schema (e.g. messages for chat), update here.
      "content": [
        {
          "mimeType": "text/plain",
          "text": prompt
        }
      ],
      "temperature": 0.2,
      "maxOutputTokens": 420
    };

    // Call the Generative Language API with Authorization Bearer token
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body)
    });

    const text = await r.text();
    if (!r.ok) {
      console.error('Gemini provider error', r.status, text);
      return res.status(502).json({ status: r.status, raw: text });
    }

    // Try parse JSON
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json({ ok: true, modelResponse: parsed });
    } catch {
      return res.status(200).json({ ok: true, raw: text });
    }

  } catch (err: any) {
    console.error('generate.ts exception', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
