import type { APIRoute } from "astro";
import type { PickStatus } from "../../../lib/database.types";

export const prerender = false;

const VALID: readonly PickStatus[] = ["wishlist", "reading", "read"];

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const form = await request.formData();
  const bookId = String(form.get("book_id") ?? "");
  const statusRaw = String(form.get("status") ?? "");
  const personalNote = String(form.get("personal_note") ?? "").trim() || null;
  const next = String(form.get("next") ?? `/books/${bookId}`) || "/";

  if (!bookId || !VALID.includes(statusRaw as PickStatus)) {
    return new Response(JSON.stringify({ error: "잘못된 입력입니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await locals.supabase.from("user_picks").upsert(
    {
      user_id: locals.user.id,
      book_id: bookId,
      status: statusRaw as PickStatus,
      personal_note: personalNote,
    } as never,
    { onConflict: "user_id,book_id" },
  );

  if (error) {
    return new Response(
      JSON.stringify({ error: `저장 실패: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return redirect(next, 303);
};
