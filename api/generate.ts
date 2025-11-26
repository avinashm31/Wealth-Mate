// api/generate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Robust serverless endpoint for AI generation.
 * - Uses env GEMINI_API_KEY and optional GEMINI_API_URL (recommended).
 * - If Gemini call fails, returns a clear simulated fallback so UI works.
 */

const DEFAULT_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = (req.body && typeof req.body === 'object') ? req.body : { prompt: String(req.body || '') };
    const textPrompt = (prompt && typeof prompt === 'string' && prompt.length > 0)
      ? prompt
      : 'Summarize and give 3 budgeting steps for this user based on spending.';

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_URL = process.env.GEMINI_API_URL || DEFAULT_GEMINI_URL;

    // If no key, immediately return fallback (keeps UI functional)
    if (!GEMINI_KEY) {
      console.warn('GEMINI_API_KEY not set — returning simulated advice.');
      return res.status(200).json({
        provider: 'simulated',
        success: false,
        advice: [
          '• Reduce Food & Dining by 20% this month.',
          '• Pause one streaming subscription for 3 months.',
          '• Move ₹500/week to a separate savings bucket.'
        ],
        note: 'No GEMINI_API_KEY configured. Set GEMINI_API_KEY in Vercel project env to enable live AI.'
      });
    }

    // Build request body suitable for the v1beta text-bison generateText
    const body = {
      prompt: { text: textPrompt },
      // optional config space — reduce tokens for faster, cheaper responses
      // temperature: 0.2
      // You can add more fields here depending on model endpoint requirements
    };

    // Two common auth patterns: API key as query param (key=...) or Bearer
    // Google docs commonly show ?key=<API_KEY> for api-key access; some preview models require OAuth.
    // We'll try query param first, and if that fails, we will also try sending Authorization header.
    const tryUrls = [
      // append key as query param
      GEMINI_URL.includes('?') ? `${GEMINI_URL}&key=${GEMINI_KEY}` : `${GEMINI_URL}?key=${GEMINI_KEY}`,
    ];

    // Also include plain url (without query) but with Authorization header (some setups accept bearer)
    // We'll do one fetch attempt; if it 401s or non-ok, we'll return fallback after logging.
    let fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' as string },
      body: JSON.stringify(body)
    };

    let lastError: any = null;
    for (const url of tryUrls) {
      try {
        console.log('Calling Gemini endpoint:', url);
        const r = await fetch(url, fetchOptions as any);
        const text = await r.text();

        if (!r.ok) {
          console.warn('Gemini non-ok response', r.status, text);
          lastError = { status: r.status, text };
          continue; // try next url or fallback
        }

        // Try parse JSON
        let parsed;
        try { parsed = JSON.parse(text); } catch (parseErr) { parsed = text; }

        return res.status(200).json({ provider: 'gemini', success: true, raw: parsed });
      } catch (err) {
        console.error('Fetch attempt error for url', url, err);
        lastError = err;
      }
    }

    // If we get here, all attempts failed. Log and return simulated fallback.
    console.error('All Gemini attempts failed. Last error:', lastError);
    return res.status(200).json({
      provider: 'simulated',
      success: false,
      advice: [
        '• Cut discretionary food deliveries by 20% this month.',
        '• Delay non-essential shopping for 2 weeks.',
        '• Automate ₹500/wk savings into a separate account.'
      ],
      debug: {
        message: 'Gemini calls failed. Check GEMINI_API_KEY, GEMINI_API_URL, and Vercel function logs.',
        lastError: String(lastError)
      }
    });
  } catch (topErr) {
    console.error('Unhandled error in /api/generate:', topErr);
    return res.status(500).json({ error: 'Internal server error', details: String(topErr) });
  }
}
