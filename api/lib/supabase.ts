import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://fnwlnevaqxbabnvmxdtq.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2xuZXZhcXhiYWJudm14ZHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODYyMTksImV4cCI6MjA5NjE2MjIxOX0.ODpjh8_Qb3k4lymsFTu6AApiWwPg0ZZLbykbpI_NGnw";

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  });
}

export function getSupabaseClientWithAuth(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}
