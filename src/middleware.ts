import type { MiddlewareHandler } from "astro";
import { createSupabaseServerClient } from "./lib/supabase-server";

const PROTECTED_PREFIXES = ["/me", "/books/new"];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const supabase = createSupabaseServerClient(context.cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user;
  context.locals.supabase = supabase;

  const pathname = new URL(context.request.url).pathname;
  const protectedRoute = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (protectedRoute && !user) {
    return context.redirect(`/login?next=${encodeURIComponent(pathname)}`, 303);
  }

  return next();
};
