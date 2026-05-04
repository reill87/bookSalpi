import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return redirect(
      `/login?error=${encodeURIComponent("OAuth code가 없습니다.")}`,
      303,
    );
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`, 303);
  }

  return redirect(next, 303);
};
