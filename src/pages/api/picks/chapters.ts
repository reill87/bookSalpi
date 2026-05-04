import type { APIRoute } from "astro";
import type { ChapterNote, PickStatus } from "../../../lib/database.types";

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

  // chapter[<title>][read|note] 형태로 들어옴
  const chapterNotes: Record<string, ChapterNote> = {};
  form.forEach((value, key) => {
    const m = key.match(/^chapter\[(.+?)\]\[(read|note)\]$/);
    if (!m) return;
    const [, title, field] = m;
    chapterNotes[title] ??= { read: false };
    if (field === "read") {
      chapterNotes[title].read = value === "on" || value === "true";
    } else if (field === "note") {
      const note = String(value).trim().slice(0, 500);
      if (note) chapterNotes[title].note = note;
    }
  });

  // 기존 user_pick 행이 없으면 status='reading' 디폴트로 생성
  const existing = await locals.supabase
    .from("user_picks")
    .select("status")
    .eq("user_id", locals.user.id)
    .eq("book_id", bookId)
    .maybeSingle<{ status: PickStatus }>();

  const status: PickStatus = existing.data?.status ?? "reading";

  const { error } = await locals.supabase.from("user_picks").upsert(
    {
      user_id: locals.user.id,
      book_id: bookId,
      status,
      chapter_notes: chapterNotes,
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
