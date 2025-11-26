// src/components/SignOutButton.jsx
import React from "react";
import { supabase } from "../lib/supabaseClient";

export default function SignOutButton() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
  return <button type="button" onClick={signOut} className="px-3 py-2 border rounded">Sign out</button>;
}
