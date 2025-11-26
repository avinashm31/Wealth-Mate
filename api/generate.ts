// api/generate.ts (Vercel Serverless - TS)
import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = process.env.GEMINI_API_URL || 'https://us-central1-aiplatform.googleapis.com/v1beta2/projects/YOUR_PROJECT/locations/global/models/YOUR_MODEL:predict';

if (!GEMINI_KEY) {
  console.warn('GEMINI_API_KEY not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });

    const { prompt, instructions } = req.body ?? {};

    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Standard Bearer pattern - many Google endpoints accept Bearer token.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // Try Bearer first. If your Google API expects an API key in query param, change accordingly.
      'Authorization': `Bearer ${GEMINI_KEY}`,
    };

    // If your service expects API key as header 'x-goog-api-key' (older patterns),
    // uncomment the following and remove Bearer above:
    // headers['x-goog-api-key'] = GEMINI_KEY;

    /*
      If the API endpoint strictly requires an OAuth2 access token (common),
      you'll need to mint a token from a service account JSON. Example flow (node):
        - Load service account json (don't commit to git; store in Vercel secret and mount in environment)
        - Use google-auth-library to create a JWT and get access token, then use that bearer token.
      If you need that code, tell me and I will provide the snippet.
    */

    // Build request body according to the model API. Keep payload minimal for categorization.
    const body = {
      // This will vary by exact endpoint; adapt to the API you intend to call.
      input: {
        // example format — adapt to your model's expected input
        text: `${instructions ?? ''}\n\n${prompt}`
      },
      // optional: model config, temperature, max tokens, etc.
    };

    const aiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('AI provider error', aiResp.status, txt);
      return res.status(aiResp.status).send({ error: 'AI provider error', detail: txt });
    }

    const json = await aiResp.json();
    return res.status(200).json({ result: json });
  } catch (err: any) {
    console.error('Server error /api/generate', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}
