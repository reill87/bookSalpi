import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/") || "/";

  if (!email || password.length < 8) {
    return redirect(
      `/login?mode=signup&error=${encodeURIComponent("이메일과 8자 이상 비밀번호를 입력하세요.")}&next=${encodeURIComponent(next)}`,
      303,
    );
  }

  const { data, error } = await locals.supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${url.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return redirect(
      `/login?mode=signup&error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
      303,
    );
  }

  // Email confirmation off → 즉시 세션. on → 메일 확인 안내.
  if (data.session) {
    return redirect(next, 303);
  }
  return redirect(
    `/login?error=${encodeURIComponent("회원가입 메일을 확인해주세요. (이메일 확인 후 다시 로그인하시면 됩니다.)")}&next=${encodeURIComponent(next)}`,
    303,
  );
};
