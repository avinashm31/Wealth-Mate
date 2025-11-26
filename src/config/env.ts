// src/config/env.ts
// Simple, public config for Supabase + Gemini
// You said keys can be public, so we keep them here.

export const ENV = {
  SUPABASE_URL: "https://hhsfmkxlzwyxtqftyieb.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhoc2Zta3hsend5eHRxZnR5aWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNzU1NTUsImV4cCI6MjA3OTY1MTU1NX0.OAz-1r_y5XZBQMW-vfcoFcSU3jg1zxonyrgtdY689nQ",

  GEMINI_API_KEY: "AIzaSyCBjoyOyZX_EYUz-sN7-czXAHZm0kTb1FE",

  // This is the standard Gemini text endpoint
  GEMINI_API_URL: "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent"
};
