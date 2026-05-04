import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const form = await request.formData();
  const bookId = String(form.get("book_id") ?? "");
  const next = String(form.get("next") ?? `/books/${bookId}`) || "/";

  if (!bookId) {
    return new Response(JSON.stringify({ error: "book_id 누락" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await locals.supabase
    .from("user_picks")
    .delete()
    .eq("user_id", locals.user.id)
    .eq("book_id", bookId);

  if (error) {
    return new Response(
      JSON.stringify({ error: `삭제 실패: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return redirect(next, 303);
};
