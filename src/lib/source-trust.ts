// 후기 출처의 신뢰도를 분류합니다.
// 워커 v2 §4.4의 협찬·마케팅 키워드 정책을 화면에 시각화하는 데 사용.
//
// 분석 워커가 작성한 raw_sources[].summary 텍스트 안의 단서로
// 4가지 trust level을 자동 도출합니다. 데이터 마이그레이션 없이 동작하도록
// 텍스트 패턴 매칭만 사용합니다 (워커가 미래에 명시적 trust 필드를 채우면
// 그것을 우선 사용하도록 확장 가능).

import type { RawSource } from "./database.types";

export type TrustLevel = "independent" | "sponsored" | "promotional" | "meta";

export interface SourceWithTrust extends RawSource {
  trust: TrustLevel;
  trustReason?: string;
}

// summary 안의 부정형 표현(예: "협찬 표시 없음", "체험단 아님")을 먼저 제거한 뒤
// 패턴 매칭. 이렇게 안 하면 워커가 협찬 검증 결과를 "표시 없음"으로 기록한
// 케이스를 협찬으로 오분류함.
const NEGATION_REMOVAL = [
  /협찬\s*표시\s*없음/g,
  /협찬\s*명시\s*없음/g,
  /협찬\s*없음/g,
  /체험단\s*아님/g,
  /비협찬/g,
  /협찬이?\s*아닌/g,
];

function stripNegations(text: string): string {
  let out = text;
  for (const re of NEGATION_REMOVAL) out = out.replace(re, "");
  return out;
}

const SPONSORED_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /무료로?\s*제공받아/, reason: "출판사 협찬 명시" },
  { re: /협찬/, reason: "협찬 명시" },
  { re: /체험단/, reason: "체험단 활동" },
  { re: /수수료를?\s*제공받/, reason: "수수료 받는 어필리에이트" },
  { re: /쇼핑\s*커넥트/, reason: "어필리에이트 마케팅" },
  { re: /파트너스/, reason: "어필리에이트 파트너스" },
  { re: /광고\s*포함|이?\s*포스팅은\s*소정의/, reason: "광고 포함 명시" },
];

const PROMOTIONAL_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /보도자료\s*톤|출판사\s*보도자료/, reason: "보도자료 톤" },
  { re: /필독서|인생\s*책/, reason: "마케팅 문구" },
  {
    re: /추상적\s*칭찬|일반적이고\s*추상적/,
    reason: "구체성 부족 (분석 한계 마킹)",
  },
  { re: /해시태그.*출판사/, reason: "출판사 해시태그 의심" },
];

const META_TYPES: ReadonlyArray<RawSource["type"]> = [
  "kyobo_review",
  "aladin_review",
  "other",
];

export function classifyTrust(source: RawSource): SourceWithTrust {
  // 메타 타입(상품 페이지·자료 한계 기록)은 후기 신뢰도와 별개
  if (META_TYPES.includes(source.type)) {
    return { ...source, trust: "meta" };
  }

  const cleaned = stripNegations(source.summary);
  for (const { re, reason } of SPONSORED_PATTERNS) {
    if (re.test(cleaned)) {
      return { ...source, trust: "sponsored", trustReason: reason };
    }
  }
  for (const { re, reason } of PROMOTIONAL_PATTERNS) {
    if (re.test(cleaned)) {
      return { ...source, trust: "promotional", trustReason: reason };
    }
  }
  return { ...source, trust: "independent" };
}

export function classifySources(sources: RawSource[]): SourceWithTrust[] {
  return sources.map(classifyTrust);
}

export interface TrustBreakdown {
  independent: number;
  sponsored: number;
  promotional: number;
  meta: number;
  total: number;
  // 의미 있는 후기(독자 후기) 중 독립 후기 비율
  independentRatio: number;
}

export function summarizeTrust(sources: SourceWithTrust[]): TrustBreakdown {
  const counts = { independent: 0, sponsored: 0, promotional: 0, meta: 0 };
  for (const s of sources) counts[s.trust]++;
  const reviewerCount =
    counts.independent + counts.sponsored + counts.promotional;
  return {
    ...counts,
    total: sources.length,
    independentRatio:
      reviewerCount === 0 ? 0 : counts.independent / reviewerCount,
  };
}

export const TRUST_LABEL: Record<TrustLevel, string> = {
  independent: "독립 후기",
  sponsored: "협찬",
  promotional: "마케팅 톤",
  meta: "출처/메타",
};

export const TRUST_BADGE_CLASS: Record<TrustLevel, string> = {
  independent: "bg-emerald-100 text-emerald-800",
  sponsored: "bg-amber-100 text-amber-800",
  promotional: "bg-orange-100 text-orange-800",
  meta: "bg-neutral-100 text-neutral-600",
};
