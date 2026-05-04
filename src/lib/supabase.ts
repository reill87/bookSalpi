import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env and fill in values from your Supabase project.",
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  url,
  anonKey,
);
