// 서버(SSR) 측 Supabase 클라이언트.
// 미들웨어/엔드포인트에서 쿠키 기반 세션을 읽고 쓸 때 사용합니다.
// 모든 호출은 chaeksalpi schema 기본.

import { createServerClient as createSsrClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { Database } from "./database.types";

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY for server client.",
  );
}

interface AstroCookieOptions {
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "lax" | "none" | "strict";
  secure?: boolean;
}

export function createSupabaseServerClient(cookies: AstroCookies) {
  return createSsrClient<Database, "chaeksalpi">(url, anonKey, {
    cookies: {
      get: (name) => cookies.get(name)?.value,
      set: (name, value, options: AstroCookieOptions) =>
        cookies.set(name, value, options),
      remove: (name, options: AstroCookieOptions) =>
        cookies.delete(name, options),
    },
    db: { schema: "chaeksalpi" },
  });
}
