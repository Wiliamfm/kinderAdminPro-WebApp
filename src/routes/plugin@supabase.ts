import { RequestHandler } from "@builder.io/qwik-city";
import { generateSupabaseIfNeeded } from "~/services/supabase.service";

export const onRequest: RequestHandler = (async request => {
  const url = request.env.get("SUPABASE_URL");
  const key = request.env.get("SUPABASE_KEY");
  if (!url || !key) {
    throw new Error("Supabase variables not initialized");
  }
  generateSupabaseIfNeeded(url, key);
});
