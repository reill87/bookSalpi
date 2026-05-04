# 책살피 분석 워커

> Claude Code에서 실행하는 도서 분석 작업 정의.
> Claude scheduled가 매일 새벽 이 파일을 읽고 처리합니다.
> PRD §7 참고. 프롬프트 버전: `v1`.

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
select id, title, author, isbn, publisher, source_url, category, description
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

### 3. 자료 수집

#### 3.1 `insane-search`로 네이버 블로그 후기
다음 쿼리 각각으로 검색:
- `"{제목}" 후기`
- `"{제목}" 서평`
- `"{제목}" {저자} 리뷰`

수집한 글에서 다음을 제외:
- 출판사/저자가 직접 운영하는 블로그
- "체험단", "도서 협찬", "출판사로부터 제공" 명시 글
- 제목/저자만 반복하고 본문이 없는 글
- 광고 링크가 본문의 30% 이상인 글

각 글에서 추출:
- URL
- 작성자 추정 정보 (전문 리뷰어 / 일반 독자 / 마케팅 의심)
- 핵심 평가 1~2줄 요약

#### 3.2 `deep-research`로 보강 자료
다음 관점별로 검색:
- 알라딘, 교보, YES24의 사용자 리뷰 종합
- 저자의 다른 저서, 해당 분야 권위
- 같은 분야의 다른 추천 도서 (비교 대상 발굴)
- 뉴스레터/언론 언급 (있다면)

### 4. 4가지 관점 분석 생성

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
  "weaknesses": "<리뷰에서 자주 언급되는 약점/한계. 불릿이 아닌 단락으로>",
  "reading_cost": {
    "pages": <쪽수, 미상이면 null>,
    "difficulty": "<입문 | 중급 | 심화>",
    "translation": "<번역서면 번역 품질에 대한 평가, 아니면 null>",
    "est_hours": <예상 소요 시간(시간 단위), 미상이면 null>
  },
  "raw_sources": [
    {
      "type": "<naver_blog | aladin_review | kyobo_review | blog | other>",
      "url": "<출처 URL>",
      "summary": "<이 출처에서 인용한 핵심 내용 1~2줄>"
    }
  ]
}
```

#### 분석 원칙
- 자료에 없는 내용은 **추측 금지**. 해당 필드를 `"정보 부족"` 또는 `null`로 표기.
- 각 분석 항목은 `raw_sources`의 URL로 추적 가능해야 합니다.
- 마케팅성 문구("필독서", "인생 책") 사용 금지. 구체적이고 비판적으로.
- 비슷한 책 비교는 추상적 비교 금지. "X는 이론 중심, 이 책은 사례 중심" 같이 구체적으로.
- `similar_books`는 2~3권. 너무 많으면 노이즈.

### 5. 결과 저장

```sql
insert into chaeksalpi.analyses (
  book_id,
  target_reader,
  similar_books,
  weaknesses,
  reading_cost,
  raw_sources,
  model_version,
  prompt_version
) values (
  :book_id,
  :target_reader,
  :similar_books_jsonb,
  :weaknesses,
  :reading_cost_jsonb,
  :raw_sources_jsonb,
  'claude-opus-4-7',
  'v1'
);

update chaeksalpi.books set status = 'done' where id = :book_id;

update chaeksalpi.analysis_jobs
set finished_at = now(), status = 'success'
where id = :job_id;
```

### 6. 실패 처리

분석 도중 예외(자료 0건, JSON 파싱 실패, 네트워크 오류 등)가 발생하면:

```sql
update chaeksalpi.books set status = 'failed' where id = :book_id;

update chaeksalpi.analysis_jobs
set finished_at = now(), status = 'failed', error_log = :error_text
where id = :job_id;
```

다음 실행에서 자동 재시도하지 않습니다 (status='failed'이므로 §1 쿼리에 잡히지 않음).

---

## 운영 메모

- 1회 실행당 최대 5권 (PRD §4.2).
- `prompt_version`을 올릴 때마다 `model_version`/`prompt_version` unique 제약 덕분에 같은 책에 여러 버전 분석을 누적할 수 있습니다.
- 결과 품질이 일관되지 않으면 §3 자료 수집 단계의 필터를 먼저 의심.
- 작업 종료 시 사용자에게 처리 결과 요약을 보고합니다 (성공 권 수, 실패 권 수, 실패 사유).
