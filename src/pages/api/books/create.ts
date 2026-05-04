import type { APIRoute } from "astro";
import {
  parseInput,
  fetchBookMetadata,
  type BookMetadata,
} from "../../../lib/book-fetch";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  // /books/new가 미들웨어 보호 라우트라 user는 사실상 항상 존재.
  // 직접 API 호출 케이스만 명시적 가드.
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const form = await request.formData();
  const inputRaw = String(form.get("input") ?? "").trim();
  const category = String(form.get("category") ?? "").trim() || null;
  const addedContext =
    String(form.get("added_context") ?? "")
      .trim()
      .slice(0, 200) || null;

  if (!inputRaw) {
    return new Response(
      JSON.stringify({ error: "URL 또는 ISBN을 입력하세요." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const parsed = parseInput(inputRaw);
  if (!parsed) {
    return new Response(
      JSON.stringify({
        error:
          "지원하지 않는 입력입니다. 알라딘/교보 URL 또는 13자리 ISBN을 넣어주세요.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let metadata: BookMetadata;
  try {
    metadata = await fetchBookMetadata(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: `메타데이터 수집 실패: ${msg}` }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const supabase = locals.supabase;

  // ISBN 중복 시 기존 행으로 redirect
  if (metadata.isbn) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("isbn", metadata.isbn)
      .maybeSingle<{ id: string }>();
    if (existing) {
      return redirect(`/books/${existing.id}`, 303);
    }
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      ...metadata,
      category,
      status: "pending",
      added_by: locals.user.id,
      added_context: addedContext,
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return new Response(
      JSON.stringify({ error: `DB 저장 실패: ${error?.message ?? "unknown"}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return redirect(`/books/${data.id}`, 303);
};
