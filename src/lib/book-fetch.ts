// 책 메타데이터를 외부 소스(교보·알라딘)에서 자동으로 수집합니다.
// 워커 v2 §3.0 / §3 메타데이터 보강 절차의 코드 버전 — 같은 패턴.

export interface BookMetadata {
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  published_date: string | null;
  cover_url: string | null;
  description: string | null;
  toc: string | null;
  source_url: string;
  category: string | null;
}

export type ParsedInput =
  | { kind: "kyobo"; url: string }
  | { kind: "aladin"; url: string }
  | { kind: "isbn"; isbn: string };

const ISBN_RE = /^97[89]\d{10}$/;
const KYOBO_RE = /^https?:\/\/product\.kyobobook\.co\.kr\/detail\/S\d+/;
const ALADIN_RE =
  /^https?:\/\/www\.aladin\.co\.kr\/shop\/wproduct\.aspx\?ItemId=\d+/;

export function parseInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[-\s]/g, "");
  if (ISBN_RE.test(digits)) return { kind: "isbn", isbn: digits };
  if (KYOBO_RE.test(trimmed)) return { kind: "kyobo", url: trimmed };
  if (ALADIN_RE.test(trimmed)) return { kind: "aladin", url: trimmed };
  return null;
}

async function jinaFetch(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { "User-Agent": "booksalpi/0.1" },
  });
  if (!res.ok) {
    throw new Error(`jina fetch failed (${res.status}): ${url}`);
  }
  return res.text();
}

function extractKyoboMeta(
  md: string,
  sourceUrl: string,
): Partial<BookMetadata> {
  const meta: Partial<BookMetadata> = { source_url: sourceUrl };

  const titleMatch = md.match(
    /Title:\s*([^|]+?)\s*\|\s*([^-]+?)\s*-\s*교보문고/,
  );
  if (titleMatch) {
    meta.title = titleMatch[1].trim();
    meta.author = titleMatch[2].trim();
  }

  const isbnMatch = md.match(/\|\s*ISBN\s*\|\s*(\d{13})\s*\|/);
  if (isbnMatch) meta.isbn = isbnMatch[1];
  if (meta.isbn) {
    meta.cover_url = `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${meta.isbn}.jpg`;
  }

  const dateMatch = md.match(
    /발행\(출시\)일자\s*\|\s*(\d{4})년\s*(\d{2})월\s*(\d{2})일/,
  );
  if (dateMatch) {
    meta.published_date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }

  // 저자 보강: 작가정보 섹션의 ### 저자(글) 패턴이 있으면 더 정확한 다중 저자 + 번역가 표시.
  // 없으면 위 Title 라인의 단일 저자가 유지됨.
  const authorNames: string[] = [];
  const authorMatches = Array.from(
    md.matchAll(/###\s*저자\(글\)\[([^\]]+)\]/g),
  );
  for (const m of authorMatches) authorNames.push(m[1].trim());
  const transMatch = md.match(/###\s*번역\[([^\]]+)\]/);
  if (authorNames.length > 0) {
    let combined = authorNames.join(", ");
    if (transMatch) combined += ` (${transMatch[1].trim()} 옮김)`;
    meta.author = combined;
  }

  // 출판사: kyobo의 jina markdown에서 누락되는 경우가 많아 호출자가 알라딘으로 보강.
  const pubMatch = md.match(
    /\[([^\]]+)\]\(https:\/\/search\.kyobobook\.co\.kr\/search\?keyword=[^&]+&pbcmCode=/,
  );
  if (pubMatch) meta.publisher = pubMatch[1];

  // description: 출판사 서평 우선, 없으면 책 소개
  const descMatch =
    md.match(/##\s*출판사 서평\s*\n([\s\S]*?)(?=\n##\s|\n\*\s*펼치기)/) ||
    md.match(/##\s*책 소개\s*\n([\s\S]*?)(?=\n##\s)/);
  if (descMatch) {
    const text = descMatch[1]
      .replace(/^\s*\*\s+\[?[^\n]*\]?\([^)]+\)\s*$/gm, "") // 카테고리/링크 라인 제거
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text.length > 50) meta.description = text.slice(0, 1500);
  }

  const tocMatch = md.match(/##\s*목차\s*\n([\s\S]*?)(?=\n##\s|\n\*\s*펼치기)/);
  if (tocMatch) {
    meta.toc = tocMatch[1]
      .replace(/^\*\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 3000);
  }

  return meta;
}

async function aladinIsbnSearch(isbn: string): Promise<{
  publisher: string | null;
  itemId: string | null;
}> {
  const md = await jinaFetch(
    `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${isbn}`,
  );
  const itemMatch = md.match(/wproduct\.aspx\?ItemId=(\d+)/);
  const pubMatch = md.match(
    /\|\s*\[([^\]]+)\]\(https:\/\/www\.aladin\.co\.kr\/search\/wsearchresult\.aspx\?PublisherSearch=/,
  );
  return {
    publisher: pubMatch ? pubMatch[1] : null,
    itemId: itemMatch ? itemMatch[1] : null,
  };
}

export async function fetchBookMetadata(
  input: ParsedInput,
): Promise<BookMetadata> {
  let kyoboUrl: string | null = null;

  if (input.kind === "kyobo") {
    kyoboUrl = input.url;
  } else if (input.kind === "isbn") {
    const md = await jinaFetch(
      `https://search.kyobobook.co.kr/search?keyword=${input.isbn}`,
    );
    const linkMatch = md.match(
      /https:\/\/product\.kyobobook\.co\.kr\/detail\/S\d+/,
    );
    if (linkMatch) kyoboUrl = linkMatch[0];
  }

  let meta: Partial<BookMetadata> = {};
  if (kyoboUrl) {
    const md = await jinaFetch(kyoboUrl);
    meta = extractKyoboMeta(md, kyoboUrl);
  } else if (input.kind === "aladin") {
    // 알라딘만 있는 경우는 일단 source_url만 채우고 워커가 후에 보강.
    meta = { source_url: input.url, title: "(메타데이터 미수집)" };
  } else if (input.kind === "isbn") {
    meta = { isbn: input.isbn, source_url: "", title: "(메타데이터 미수집)" };
  }

  // 출판사 누락 시 알라딘으로 보강
  if (meta.isbn && !meta.publisher) {
    try {
      const ala = await aladinIsbnSearch(meta.isbn);
      if (ala.publisher) meta.publisher = ala.publisher;
    } catch {
      // 보강 실패는 무시
    }
  }

  if (!meta.title) {
    throw new Error("책 메타데이터를 추출하지 못했습니다.");
  }

  return {
    isbn: meta.isbn ?? null,
    title: meta.title,
    author: meta.author ?? null,
    publisher: meta.publisher ?? null,
    published_date: meta.published_date ?? null,
    cover_url: meta.cover_url ?? null,
    description: meta.description ?? null,
    toc: meta.toc ?? null,
    source_url: meta.source_url ?? "",
    category: null,
  };
}
