// api/generate.ts
// Vercel serverless function that proxies requests to the AI provider (Gemini/Generative API).
// Supports two auth modes:
//  - Service account OAuth: set GCP_SA_JSON env var (full JSON) -> recommended for Google Gemini
//  - API key fallback: set GEMINI_API_KEY (less secure / endpoint-dependent)
//
// Dependencies: google-auth-library (for service account). Install locally and ensure Vercel will install:
// npm install google-auth-library
//
// Environment variables (set in Vercel):
//  - GEMINI_API_URL  (required) e.g. https://generativelanguage.googleapis.com/v1beta2/models/...
//  - GEMINI_API_KEY  (optional) API key fallback
//  - GEMINI_USE_X_GOOG_API_KEY (optional) set "true" to send x-goog-api-key header instead of Authorization Bearer with the GEMINI_API_KEY
//  - GCP_SA_JSON     (optional) full JSON string of service account for OAuth token flow
//
// Request format (client -> this function):
//  POST /api/generate  { "prompt": "<text>", "options": {...} }
//
// Response:
//  200 { result: <parsedJSON or rawText> }
//  4xx/5xx { error: ..., detail: ... }

import type { VercelRequest, VercelResponse } from '@vercel/node';

// dynamic import of google-auth-library inside function to avoid requiring it if using API key mode
async function getAccessTokenFromServiceAccount(saJsonString?: string) {
  if (!saJsonString) throw new Error('No service account JSON provided');
  // lazy import to avoid error if package not installed and this path isn't used
  const { JWT } = await import('google-auth-library');
  const sa = JSON.parse(saJsonString);
  const client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    subject: sa.client_email,
  });
  const tokenRes = await client.getAccessToken();
  if (!tokenRes || !tokenRes.token) throw new Error('Failed to obtain access token');
  return tokenRes.token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body ?? {};
    const prompt = typeof body === 'string' ? JSON.parse(body).prompt : body.prompt;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt in request body' });

    const GEMINI_API_URL = process.env.GEMINI_API_URL;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GCP_SA_JSON = process.env.GCP_SA_JSON;
    const USE_X_GOOG = (process.env.GEMINI_USE_X_GOOG_API_KEY || '').toLowerCase() === 'true';

    if (!GEMINI_API_URL) {
      console.error('Missing GEMINI_API_URL env var');
      return res.status(500).json({ error: 'Server misconfiguration: GEMINI_API_URL missing' });
    }

    // Build a provider-specific request payload.
    // NOTE: adapt to the exact model API you are using. For Google Gemini, the payload shape depends on the endpoint.
    // Here we send a simple JSON with "prompt" in a reasonable wrapper; adjust if your model requires `instances`, `input`, or `contents`.
    const providerPayload = {
      // Example generic shape — modify if your model API expects different fields
      input: {
        // keep it in a property the provider expects, or create your own mapping
        text: String(prompt),
      },
      // You can accept extra options and forward them:
      ...(body.options || {}),
    };

    // Determine auth header
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (GCP_SA_JSON) {
      // Use OAuth flow (recommended for Google endpoints that require OAuth)
      let token: string;
      try {
        token = await getAccessTokenFromServiceAccount(GCP_SA_JSON);
      } catch (err: any) {
        console.error('Failed to mint OAuth token from service account', err);
        return res.status(500).json({ error: 'Failed to mint OAuth token', detail: String(err?.message || err) });
      }
      headers['Authorization'] = `Bearer ${token}`;
    } else if (GEMINI_API_KEY) {
      // fallback: send API key. Some Google endpoints expect x-goog-api-key header; others accept Bearer.
      if (USE_X_GOOG) {
        headers['x-goog-api-key'] = GEMINI_API_KEY;
      } else {
        headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;
      }
    } else {
      return res.status(500).json({ error: 'No authentication method configured for AI provider' });
    }

    // Call provider
    const providerResp = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(providerPayload),
    });

    const text = await providerResp.text();
    if (!providerResp.ok) {
      console.error('AI provider error', providerResp.status, text);
      return res.status(providerResp.status).json({ error: 'AI provider error', status: providerResp.status, detail: text });
    }

    // try parse JSON, otherwise return text
    try {
      const json = JSON.parse(text);
      return res.status(200).json({ result: json });
    } catch {
      return res.status(200).json({ result: text });
    }
  } catch (err: any) {
    console.error('Unhandled error in /api/generate', err);
    return res.status(500).json({ error: 'Internal server error', detail: String(err?.message || err) });
  }
}
