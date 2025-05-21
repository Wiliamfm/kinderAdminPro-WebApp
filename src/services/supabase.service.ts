import { SupabaseClient, createClient } from '@supabase/supabase-js'

let supabase: SupabaseClient;

export function getSupabase() {
  if (!supabase) {
    throw new Error("Supabase not initialized");
  }
  return supabase;
}

export function generateSupabaseIfNeeded(url: string, key: string) {
  if (!supabase) {
    supabase = createClient(url, key);
  }
}
