import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/") || "/";

  if (!email || !password) {
    return redirect(
      `/login?error=${encodeURIComponent("이메일과 비밀번호를 입력하세요.")}&next=${encodeURIComponent(next)}`,
      303,
    );
  }

  const { error } = await locals.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`,
      303,
    );
  }

  return redirect(next, 303);
};
