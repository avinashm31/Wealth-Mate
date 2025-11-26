// src/pages/login.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // If you require email verification, check user metadata
      if (data?.user && !data.user.email_confirmed_at) {
        setMsg({ type: "warn", text: "Please verify your email (check inbox)." });
        setLoading(false);
        return;
      }

      setMsg({ type: "success", text: "Login successful — redirecting..." });
      // redirect to app dashboard
      window.location.href = "/app/dashboard";
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Login failed" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signUp({ email, password }, { emailRedirectTo: window.location.origin + "/app/dashboard" });
      if (error) throw error;
      setMsg({ type: "success", text: "Signup successful. Check your email to verify." });
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Signup failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl mb-4">WealthMade — Login</h1>
      <form onSubmit={handleLogin} className="space-y-3">
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required className="w-full p-2 border rounded" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required className="w-full p-2 border rounded" />
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-gold">Login</button>
          <button type="button" onClick={handleSignup} disabled={loading} className="btn-outline">Sign up</button>
        </div>
      </form>

      {msg && <div className={`mt-4 p-3 rounded ${msg.type === "error" ? "bg-red-600" : msg.type === "warn" ? "bg-yellow-600" : "bg-green-600"}`}>{msg.text}</div>}
    </div>
  );
}
