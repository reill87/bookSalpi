// 책의 toc 텍스트에서 단편/장 제목 목록을 뽑아내는 휴리스틱.
// 단편집·에세이만 활성화 (책 카테고리에 '소설' 또는 '에세이' 키워드).

const STRUCTURAL_PATTERNS: RegExp[] = [
  /^Part\s+\d+/i,
  /^={3,}/,
  /^Part \d+\./,
  /^=== /,
];

const FOOTER_PATTERNS: RegExp[] = [
  /^해설/,
  /^추천사/,
  /^참고자료/,
  /^작가의\s*말/,
  /^옮긴이의\s*말/,
  /^에필로그$/,
  /^프롤로그$/,
];

const PAGE_TAIL = /\s*\.{2,}\s*\d+$/;
const NUMBER_PREFIX = /^\d{1,3}[.\s]\s*/;
const SUB_LIST_INDENT = /^__/;
const BULLET = /^[*•·]\s+/;

export function isFictionLike(category: string | null): boolean {
  if (!category) return false;
  return /(소설|에세이|시집|단편)/.test(category);
}

export function extractChapters(toc: string | null): string[] {
  if (!toc) return [];
  const lines = toc
    .split("\n")
    .map((l) => l.replace(BULLET, "").trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(SUB_LIST_INDENT, "").trim();
    if (!line) continue;
    if (STRUCTURAL_PATTERNS.some((re) => re.test(line))) continue;
    if (FOOTER_PATTERNS.some((re) => re.test(line))) continue;
    // 너무 길면 줄거리/요약일 가능성
    if (line.length > 60) continue;
    const cleaned = line
      .replace(NUMBER_PREFIX, "")
      .replace(PAGE_TAIL, "")
      .trim();
    if (cleaned.length < 2) continue;
    if (out.includes(cleaned)) continue;
    out.push(cleaned);
  }
  return out;
}
