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

// 책살피는 stockontext와 같은 Supabase 프로젝트를 공유하되 'chaeksalpi' schema로
// 격리되어 있습니다. createClient의 db.schema 옵션으로 기본 schema를 지정하면
// 이후 .from('books') 같은 호출이 자동으로 chaeksalpi.books를 가리킵니다.
export const supabase: SupabaseClient<Database, "chaeksalpi"> = createClient<
  Database,
  "chaeksalpi"
>(url, anonKey, {
  db: { schema: "chaeksalpi" },
});

// 서버/워커 전용. service_role key로 RLS를 bypass합니다.
// 절대 클라이언트 번들에 포함되지 않도록 server-side 코드에서만 import.
export function createServiceRoleClient(): SupabaseClient<
  Database,
  "chaeksalpi"
> {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. " +
        "Required for server-side / worker code that bypasses RLS.",
    );
  }
  return createClient<Database, "chaeksalpi">(url, serviceRoleKey, {
    db: { schema: "chaeksalpi" },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
