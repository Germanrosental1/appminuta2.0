// Supabase Client Configuration
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

// N8N Webhook URLs (proxied via Supabase Edge Functions)
export const N8N_WEBHOOKS = {
  processDocument: "https://jgtetutmrjkxfjxnlcki.supabase.co/functions/v1/process-document",
  recomputeClient: "",
};
