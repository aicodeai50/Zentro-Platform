import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicConfig } from "./publicConfig";

let supabaseClientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabaseClient() {
  supabaseClientPromise ??= getPublicConfig().then((config) => {
    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      return null;
    }

    return createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  });

  return supabaseClientPromise;
}

export function resetSupabaseClientForTests() {
  supabaseClientPromise = null;
}
