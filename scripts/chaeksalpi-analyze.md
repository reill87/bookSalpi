# 책살피 분석 워커

> Claude Code에서 실행하는 도서 분석 작업 정의.
> Claude scheduled가 매일 새벽 이 파일을 읽고 처리합니다.
> PRD §7 참고.
>
> **현재 프롬프트 버전: `v2`** (v1 → v2 변경점은 이 파일 마지막의 "버전 이력" 참고)

---

## 사전 조건

- Supabase MCP (`https://mcp.supabase.com/mcp`)가 설정되어 있어야 합니다.
  - stockontext와 같은 프로젝트를 공유하므로, MCP에서 동일한 프로젝트를 선택합니다.
  - 모든 책살피 테이블은 `chaeksalpi` schema 아래에 있습니다.
- 사용 가능한 스킬:
  - `insane-search` — 네이버 블로그/SNS 검색용
  - `deep-research` — 다각도 자료 수집용

## 실행 절차

### 1. 처리 대상 조회
Supabase MCP로 다음 SQL 실행:
```sql
select id, isbn, title, author, publisher, source_url, category, description
from chaeksalpi.books
where status = 'pending'
order by created_at asc
limit 5;
```

대상이 없으면 즉시 종료. 있는 경우 각 책마다 아래 절차 반복.

### 2. 책 상태 업데이트 (analyzing)
```sql
update chaeksalpi.books set status = 'analyzing' where id = :book_id;
insert into chaeksalpi.analysis_jobs (book_id) values (:book_id) returning id;
```
반환된 `analysis_jobs.id`를 기억.

### 3. 메타데이터 보강 (필요 시)
`books` 행에서 `publisher`, `description`, `cover_url`, `toc` 중 하나라도 누락이면 다음 절차로 보강:

#### 3.0 알라딘 ISBN 검색 (출판사 / 평점 / ItemId 보강)
```bash
curl -s "https://r.jina.ai/https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord={ISBN}"
```
- 출판사명 추출 (`PublisherSearch=...` 링크 텍스트).
- 알라딘 ItemId 추출 (`/shop/wproduct.aspx?ItemId={N}`).
- 별점·100자평·마이리뷰 수도 함께 기록 (raw_sources 메타에 사용).

> 교보 페이지의 jina 변환에서 출판사가 누락되는 케이스가 있으므로 알라딘 검색은 항상 정식 보강 단계로 둡니다.

### 4. 자료 수집

#### 4.1 검색 쿼리 — 동음이의 회피 규칙
**책 제목 단독 검색 금지.** 항상 다음 중 둘 이상을 동반:
- 저자명(저자가 외국인일 때 한글·원문 둘 다 시도)
- 출판사명
- ISBN
- 책 고유 키워드(부제, 핵심 챕터 제목, 책 표지의 문구)

**잘못된 예시 (실측 실패 케이스)**:
- `"클린 아키텍처" 후기` → "FastAPI 클린 아키텍처", "아키텍트 첫걸음" 등 5건 모두 다른 책 매칭
- `"그라운드 업" 후기` → 힙합 페스티벌(더크라이그라운드), 화장품(그라운드랩) 매칭

**올바른 예시**:
- `"클린 아키텍처" 로버트 마틴 인사이트 후기`
- `"그라운드 업" 슐츠 행복한북클럽 서평`
- `9788966262472` (ISBN — 가장 정확)

#### 4.2 네이버 블로그
`insane-search` 또는 직접 jina:
```bash
curl -s "https://r.jina.ai/https://search.naver.com/search.naver?where=blog&query={URL_ENCODED_QUERY}"
```

검색 결과에서 `https://blog.naver.com/{user}/{post}` URL을 추출한 뒤,
**반드시 `m.blog.naver.com`으로 치환해서 fetch** (데스크톱 URL은 iframe 구조라 본문이 비어 있음):
```bash
curl -s "https://r.jina.ai/https://m.blog.naver.com/{user}/{post}"
```

#### 4.3 기술서 특화 — velog / tistory / medium
기술/IT 분야 책은 네이버 블로그보다 velog·tistory·medium에 후기가 많습니다.
구글·DuckDuckGo 검색이 차단된 경우 사이트 자체 검색 또는 직접 키워드 fetch:
```bash
# velog 검색 페이지 (공개)
curl -s "https://r.jina.ai/https://velog.io/search?type=posts&q={URL_ENCODED_QUERY}"
# tistory 인기글
curl -s "https://r.jina.ai/https://www.tistory.com/category/{cat}?keyword={...}"
```

이 채널이 다 막히면 4.5의 자체 리뷰(Klover/100자평)로 보강하고 weaknesses에 자료 한계 명시.

#### 4.4 후기 마케팅성 필터
수집한 후기 본문에서 다음 키워드가 발견되면 협찬/광고로 마킹하되 폐기는 하지 않음(맥락 인용 가능):
- `"출판사로부터 책을 무료로 제공받아"`, `"체험단"`, `"도서 협찬"`, `"무상 제공"`
- `"네이버 쇼핑 커넥트"`, `"수수료를 제공받습니다"`, `"제휴 마케팅"`, `"파트너스"`
- 출판사·저자가 직접 운영하는 블로그 (예: `gilbut*`, `jeipub*`, `hanbit*` 같은 출판사 마케터 계정)

본문이 추상적 칭찬뿐이고(예: `"전 세계 ○○만 베스트셀러"`, `"필독서"`, `"인생 책"`) 책 본문 인용이 없으면 가치가 낮은 후기로 마킹.

`raw_sources[].summary`에 협찬/마케팅 여부를 명시적으로 적습니다.

#### 4.5 자체 리뷰 보강
교보 Klover 리뷰, 알라딘 100자평/마이리뷰는 카운트만이라도 raw_sources에 메타로 기록합니다 — 본문 추출이 어렵더라도 "리뷰 N개, 별점 N.N/10" 같은 신호는 분석 신뢰도 평가에 유용합니다.

#### 4.6 deep-research 보강
저자의 다른 저서, 비교 도서 후보, 영문권 평가(아마존/굿리즈)를 추가로 수집. **단, 영문권 후기에서 한국어판 번역 품질을 추론하지 말 것.**

### 5. 4가지 관점 분석 생성

다음 JSON 형식을 정확히 따릅니다 (한국어):

```json
{
  "target_reader": "<누구에게 좋은가. 권장 독자의 배경, 단계(입문/중급/심화), 관심사를 한 단락으로>",
  "similar_books": [
    {
      "title": "<유사 도서 제목>",
      "author": "<저자>",
      "diff": "<이 책과의 구체적 차이. 추상적('더 깊다') 금지>"
    }
  ],
  "weaknesses": "<리뷰에서 자주 언급되는 약점/한계. 단락. 자료 부족 시 명시적으로 표기>",
  "reading_cost": {
    "pages": <쪽수, 미상이면 null>,
    "difficulty": "<입문 | 중급 | 심화>",
    "translation": "<번역서면 번역 품질 평가, 자료 부족이면 '정보 부족'>",
    "est_hours": <예상 소요 시간(시간), 미상이면 null>
  },
  "raw_sources": [
    {
      "type": "<naver_blog | aladin_review | kyobo_review | velog | tistory | medium | blog | other>",
      "url": "<출처 URL>",
      "summary": "<인용한 핵심 1~2줄. 협찬/마케팅 후기는 명시적으로 표기>"
    }
  ]
}
```

#### 분석 원칙 (PRD §7.1 + v2 강화)
- 자료에 없는 내용은 **추측 금지**. 해당 필드를 `"정보 부족"` 또는 `null`.
- 각 분석 항목은 `raw_sources`의 URL로 추적 가능해야 함.
- 마케팅 문구("필독서", "인생 책") 사용 금지.
- 비슷한 책 비교는 **구체적**으로 ("X는 이론, 이 책은 사례 중심" 식).
- `similar_books`는 2~3권. 너무 많으면 노이즈.
- **자료 부족 케이스의 정직한 표시**: 후기 수집이 부족하거나 실패한 경우 weaknesses 첫 단락에 `[자료 수집 한계 명시]` 표기 후 어떤 채널이 실패했는지 + 분석이 무엇에 의존했는지(메타데이터 / 추천사 / 일반 지식 등) 명시.

### 6. 결과 저장

```sql
insert into chaeksalpi.analyses (
  book_id, target_reader, similar_books, weaknesses, reading_cost,
  raw_sources, model_version, prompt_version
) values (
  :book_id, :target_reader, :similar_books_jsonb, :weaknesses,
  :reading_cost_jsonb, :raw_sources_jsonb,
  'claude-opus-4-7', 'v2'
);

update chaeksalpi.books set status = 'done' where id = :book_id;

update chaeksalpi.analysis_jobs
set finished_at = now(), status = 'success', error_log = :note_or_null
where id = :job_id;
```

자료 부족이지만 분석은 작성한 경우 `analysis_jobs.error_log`에 `partial: <사유>`로 기록.

### 7. 실패 처리

다음 중 하나가 충족되면 status='failed':
- 알라딘·교보 모두에서 책 메타데이터를 찾지 못함
- 자료가 0건이고 책 자체에 대한 일반 지식도 부족해 분석 작성 불가
- JSON 파싱·DB 저장에서 예외

```sql
update chaeksalpi.books set status = 'failed' where id = :book_id;
update chaeksalpi.analysis_jobs
set finished_at = now(), status = 'failed', error_log = :error_text
where id = :job_id;
```

다음 실행에서 자동 재시도하지 않습니다 (status='failed'는 §1 쿼리에 잡히지 않음).

---

## 운영 메모

- 1회 실행당 최대 5권 (PRD §4.2).
- `prompt_version` 필드 덕분에 같은 책에 여러 버전 분석을 누적 가능 (v1 / v2 비교).
- 결과 품질이 일관되지 않으면 §4.1 검색 쿼리 동음이의 필터를 먼저 의심.
- 작업 종료 시 사용자에게 처리 결과 요약 보고: 성공 권 수, 실패 권 수, partial 권 수와 사유.

## 버전 이력

### v2 (이 문서)
- §3.0 신설: 알라딘 ISBN 검색을 메타데이터 보강 정식 단계로 편입.
- §4.1 신설: 책 제목 단독 검색 금지. 저자/출판사/ISBN 동반 강제.
- §4.2 강화: `m.blog.naver.com` 자동 치환 명시(데스크톱 URL은 빈 응답).
- §4.3 신설: 기술서용 velog/tistory/medium 보조 채널.
- §4.4 강화: 마케팅·협찬 키워드 목록 + 출판사 마케터 계정 패턴.
- §4.5 신설: Klover/100자평 카운트 메타로 보강.
- §5 강화: 자료 부족 케이스의 `[자료 수집 한계 명시]` 표기 규칙.
- §6 강화: partial 분석은 `analysis_jobs.error_log`에 사유 기록.

### v1 (책 3권 시범 분석에서 발굴된 한계)
- 그라운드 업 / 돈의 심리학 / 클린 아키텍처 분석 결과를 토대로 v2로 발전.
- 주요 발굴: 동음이의 매칭 실패(클린 아키텍처 5/5, 그라운드 업 다수), 네이버 블로그 본문 비어 있음, 출판사 누락, 마케팅 후기 비중 등.
