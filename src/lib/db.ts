// src/lib/db.ts
// Simple Supabase wrapper functions for the app CRUD operations.
// These return plain objects or throw errors (so caller can handle).
//
// Tables assumed:
//  - user_profiles (id uuid primary key, auth_uid text, name text, email text, target_savings bigint, created_at timestamptz, status text)
//  - transactions  (id uuid primary key, user_id uuid references user_profiles(id), description text, amount numeric, category text, date date, type text)
//
// Make sure your Supabase tables and RLS policies are configured accordingly.

import { supabase } from './supabaseClient';

export async function createUserProfile(authUid: string, name: string, email: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert([{ auth_uid: authUid, name, email }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserProfileByAuthUid(authUid: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_uid', authUid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchTransactionsForUser(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertTransaction(txn: {
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  type: 'expense' | 'income';
}) {
  const { data, error } = await supabase.from('transactions').insert([txn]).select().single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, patch: Partial<any>) {
  const { data, error } = await supabase.from('transactions').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { data, error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
  return data;
}

export async function purgeUserTransactions(userId: string) {
  const { data, error } = await supabase.from('transactions').delete().eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function updateUserGoalByAuthUid(authUid: string, newGoal: number) {
  // We find user_profile row by auth_uid and update target_savings
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ target_savings: newGoal })
    .eq('auth_uid', authUid)
    .select()
    .single();
  if (error) throw error;
  return data;
}
