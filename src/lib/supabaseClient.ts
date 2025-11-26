// src/lib/supabaseClient.ts
// Single exported supabase client used by frontend and server helpers (client-side requires VITE_ prefix).
//
// Environment variables:
//  - VITE_SUPABASE_URL
//  - VITE_SUPABASE_ANON_KEY
//
// In Vercel add these as Environment Variables (for production).
// If you need server-only admin (service role), add SUPABASE_SERVICE_ROLE_KEY to Vercel and use it in server functions only.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) as string;

if (!url || !anonKey) {
  // Note: in dev, you may want to allow missing keys, but we log so you can catch config issues.
  console.warn('Supabase URL or ANON KEY missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase: SupabaseClient = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
});
