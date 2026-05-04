import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const next = String(form.get("next") ?? "/") || "/";

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${url.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    return redirect(
      `/login?error=${encodeURIComponent(
        error?.message ??
          "Google 로그인이 활성화되어 있지 않습니다. Supabase 대시보드 → Authentication → Providers에서 Google을 켜야 동작합니다.",
      )}&next=${encodeURIComponent(next)}`,
      303,
    );
  }

  return redirect(data.url, 303);
};
