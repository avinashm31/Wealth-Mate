// src/lib/aiClient.ts
// Client-side helper to call the serverless /api/generate endpoint

export async function generateWithServer(prompt: string, options?: Record<string, any>) {
  const resp = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Server /api/generate failed: ${resp.status} ${errText}`);
  }
  const json = await resp.json();
  return json.result;
}
