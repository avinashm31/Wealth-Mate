// src/lib/auth.ts
import { supabase } from './supabaseClient';

export const signUp = async (email: string, password: string) => {
  return supabase.auth.signUp({ email, password }, { redirectTo: window.location.origin });
};

export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
};

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
};
