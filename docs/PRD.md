# 책살피 PRD

> AI 기반 도서 큐레이션 & 평가 서비스
> 작성일: 2026-05-04
> 작성자: Lucas

---

## 1. 배경 & 문제 정의

### 문제
- 매년 신간이 너무 많이 쏟아져서 어떤 책이 좋은지 판단하기 어렵다.
- 베스트셀러 목록은 **후보 발견(discovery)**은 해주지만 **평가(evaluation)**는 못 해준다.
- 각 책의 후기/리뷰를 일일이 찾아 읽고 종합하는 비용이 크다.
- 기존 추천 서비스(알라딘, 밀리, Goodreads 등)는 자기 플랫폼 데이터에만 갇혀 있고, 깊이 있는 비교/판단 정보를 주지 않는다.

### 가설
사용자는 "이 책 살까 말까" 망설이는 순간에, 단순 별점/리뷰 요약이 아니라 **판단을 도와주는 메타 정보**를 원한다.
- 누구에게 좋은 책인가
- 비슷한 책과 어떻게 다른가
- 약점/한계는 무엇인가
- 읽는 데 드는 비용은 얼마인가

LLM이 여러 출처의 후기를 수집/정제해 이 4가지 관점으로 분석하면, 사용자는 책 선택 비용을 크게 줄일 수 있다.

### 첫 사용자
Lucas 본인. 투자/비즈니스/기술/인문 분야 책을 다독하며 매주 "다음에 뭐 읽지" 고민 중. Dogfooding으로 검증 후 공개.

---

## 2. 목표 & Non-Goals

### 목표 (MVP)
1. 관심 있는 책을 등록하면 자동으로 분석 리포트 생성
2. 분석 결과를 공개 페이지로 게시 (다른 사용자도 열람 가능)
3. 사용자가 책을 위시리스트/읽는 중/완독으로 관리

### Non-Goals (MVP에서 안 함)
- 신간 자동 크롤링/큐레이션 → v2
- 사용자 직접 후기 작성 → v2
- 책 구매 연동 → v2
- 모바일 앱 → 웹만
- 알고리즘 추천 ("당신을 위한 책") → v2 이후
- 소셜 기능 (팔로우, 공유) → v2 이후

---

## 3. 사용자 시나리오

### 시나리오 A: 본인이 관심 책 등록
1. 트위터에서 흥미로운 책 발견
2. 책살피에 알라딘 URL 또는 ISBN 붙여넣기
3. 책 정보 자동으로 채워지고 "분석 대기" 상태로 등록
4. 다음날 새벽 분석 완료
5. 알림 받고 분석 페이지 확인 → 위시리스트에 추가 또는 패스

### 시나리오 B: 다른 사용자가 분석 결과 열람
1. 책살피 메인에서 최근 분석된 책 목록 확인
2. 관심 책 클릭 → 4가지 관점 분석 읽음
3. 가입 후 본인 위시리스트에 추가

### 시나리오 C: 본인 독서 관리
1. 책살피에서 등록한 책의 상태 변경 (위시 → 읽는 중 → 완독)
2. 완독 책에 개인 메모 추가
3. 본인 책장 페이지에서 전체 목록 확인

---

## 4. 핵심 기능

### 4.1 책 등록
- **입력**: 알라딘 URL, 교보 URL, 또는 ISBN
- **자동 fetch**: 제목, 저자, 출판사, 출간일, 표지, 책 소개, 목차
- **수동 입력 옵션**: 자동 fetch 실패 시 폼으로 직접 입력
- **권한**: 로그인한 모든 사용자

### 4.2 LLM 분석 파이프라인 (책살피 분석 워커)
- **트리거**: Claude scheduled (매일 새벽 3시) + 수동 트리거
- **실행 환경**: Claude Code (로컬)
- **처리 단위**: 1회 실행당 최대 5권
- **사용 스킬**:
  - `insane-search`: 네이버 블로그 후기 수집
  - `deep-research`: 다각도 자료 수집 (다른 플랫폼 리뷰, 도서 소개 보강)
  - 필요 시 추가 스킬 조합
- **DB 접근**: Supabase MCP

### 4.3 분석 결과 (4가지 관점)

| 섹션 | 내용 | 출력 형식 |
|------|------|----------|
| 누구에게 좋은가 | 권장 독자의 배경, 단계 (입문/중급/심화), 관심사 | 단락 + 키워드 |
| 비슷한 책과의 차이 | 유사 도서 2~3권과의 비교 | 비교 테이블 또는 단락 |
| 약점/한계 | 리뷰에서 자주 언급되는 아쉬운 점 | 불릿 또는 단락 |
| 읽는 비용 | 분량, 난이도, 번역 품질, 예상 소요 시간 | 메타 정보 + 단락 |

각 섹션은 **근거 출처(URL)**와 함께 저장. "자료 부족" 케이스는 명시적으로 표기.

### 4.4 공개 페이지
- 책 목록 페이지: 최근 분석된 순, 분야 필터
- 책 상세 페이지: 책 정보 + 4가지 관점 분석 + 출처 링크
- SEO 친화적 (Astro 정적 생성)

### 4.5 개인 책장
- 위시리스트 / 읽는 중 / 완독 3가지 상태
- 개인 메모
- 본인 책장 페이지

### 4.6 인증
- Supabase Auth
- 이메일 + 소셜 로그인 (Google 정도)

---

## 5. 기술 아키텍처

```
┌─────────────────────────────────────────┐
│  웹 UI (Astro + Supabase Client)        │
│  - 책 등록, 목록, 상세                   │
│  - 인증, 개인 책장                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Supabase                                │
│  - Postgres (books, analyses, users…)   │
│  - Auth                                  │
│  - Storage (책 표지 캐시 - 선택)         │
└──────────────┬──────────────────────────┘
               │ MCP
               ▼
┌─────────────────────────────────────────┐
│  Claude Code (분석 워커, 로컬)            │
│  - Claude scheduled로 정기 실행          │
│  - 스킬: insane-search, deep-research    │
│  - pending 책 처리 → analyses 저장       │
└─────────────────────────────────────────┘
```

### 스택
- **프론트**: Astro 5+ (Islands Architecture, brunch-front 경험 활용)
- **DB/Auth**: Supabase
- **분석 워커**: Claude Code + scheduled
- **배포**: Vercel 또는 Cloudflare Pages
- **스타일**: Tailwind CSS

---

## 6. DB 스키마 (초안)

```sql
-- 책 마스터
create table books (
  id uuid primary key default gen_random_uuid(),
  isbn text unique,
  title text not null,
  author text,
  publisher text,
  published_date date,
  cover_url text,
  description text,
  toc text,
  source_url text,           -- 알라딘/교보 등 원본 URL
  category text,             -- 분야 (예: 투자, 기술, 인문)
  status text not null default 'pending',  -- pending | analyzing | done | failed
  added_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 분석 결과
create table analyses (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books on delete cascade,
  target_reader text,           -- 누구에게 좋은가
  similar_books jsonb,          -- [{title, author, diff}, ...]
  weaknesses text,              -- 약점/한계
  reading_cost jsonb,           -- {pages, difficulty, translation, est_hours}
  raw_sources jsonb,            -- [{type, url, summary}, ...]
  model_version text,           -- 'claude-opus-4-7' 등
  prompt_version text,          -- 프롬프트 버전 추적
  generated_at timestamptz default now(),
  unique(book_id, model_version, prompt_version)
);

-- 개인 책장
create table user_picks (
  user_id uuid references auth.users,
  book_id uuid references books on delete cascade,
  status text not null,          -- wishlist | reading | read
  personal_note text,
  added_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, book_id)
);

-- 분석 작업 로그 (디버깅용)
create table analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references books on delete cascade,
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text,                   -- success | failed
  error_log text
);
```

### RLS 정책 (요지)
- `books`: 누구나 read, 로그인 사용자만 insert
- `analyses`: 누구나 read, 워커(service role)만 write
- `user_picks`: 본인만 read/write
- `analysis_jobs`: 본인만 read (added_by 기준)

---

## 7. 분석 워커 작업 정의

### 입력
- Claude scheduled가 호출하는 마크다운 작업 파일 (예: `~/scripts/chaeksalpi-analyze.md`)

### 처리 흐름
```
1. Supabase MCP로 books where status='pending' limit 5 조회
2. 각 책에 대해:
   a. status를 'analyzing'으로 업데이트, analysis_jobs에 row 생성
   b. insane-search로 네이버 블로그 후기 검색
      - 쿼리: "{제목} 후기", "{제목} 서평", "{제목} 리뷰"
      - 마케팅성 글 필터링
   c. deep-research로 추가 자료 수집
      - 알라딘/교보 리뷰 요약
      - 다른 블로그/뉴스레터 언급
      - 저자의 다른 책, 비슷한 분야 도서
   d. 4가지 관점 분석 생성 (프롬프트는 7.1 참고)
   e. analyses 테이블에 결과 저장
   f. books.status = 'done', analysis_jobs 마무리
3. 실패 시:
   - books.status = 'failed', error_log 기록
   - 다음 실행에서 재시도하지 않음 (수동 재시도 가능)
```

### 7.1 분석 프롬프트 원칙
- 자료에 없는 내용은 **추측 금지**, "정보 부족"으로 표시
- 각 분석 항목은 근거(출처 URL) 명시
- 한국어로 작성
- 마케팅성 문구("필독서", "인생 책") 사용 금지, 구체적이고 비판적으로
- 비슷한 책 비교는 추상적("더 깊다") 대신 구체적("X는 이론, 이 책은 사례 중심")

### 7.2 실행 환경
- Claude scheduled 등록
- 빈도: 매일 1회 (예: 03:00 KST)
- 추가 트리거: 책 등록 직후 즉시 실행 옵션은 v2

---

## 8. 마일스톤

### Week 1: 분석 파이프라인 검증 (UI 없이)
- [ ] Supabase 프로젝트 셋업, 스키마 적용
- [ ] Claude Code용 분석 작업 마크다운 작성
- [ ] 책 2~3권 수동 INSERT, 분석 작업 수동 실행
- [ ] 분석 결과 품질 검증 → 프롬프트/스킬 활용 튜닝
- [ ] insane-search가 책 후기에 적합한지 검증 (마케팅 글 필터링)
- **완료 기준**: 본인이 분석 결과를 보고 "쓸 만하다" 판단

### Week 2: 자동화
- [ ] Claude scheduled 등록 (매일 새벽 실행)
- [ ] analysis_jobs 로깅, 실패 케이스 처리
- [ ] 책 INSERT → 다음 날 자동 분석되는 흐름 검증
- **완료 기준**: 손 안 대고 책 등록만 하면 분석이 자동으로 됨

### Week 3-4: 웹 UI
- [ ] Astro 프로젝트 셋업, Tailwind, Supabase 클라이언트
- [ ] 인증 (이메일 + Google)
- [ ] 책 등록 페이지 (URL/ISBN 입력)
- [ ] 책 목록 페이지 (공개)
- [ ] 책 상세 페이지 (분석 결과 표시)
- [ ] 개인 책장 페이지 (위시/읽는 중/완독)
- **완료 기준**: 본인이 매일 쓰는 도구가 됨

### Week 5+: 가다듬기
- [ ] SEO (메타 태그, OG 이미지)
- [ ] 모바일 반응형
- [ ] 분석 실패 책 수동 재시도 UI
- [ ] 분야 필터, 검색
- [ ] 배포 (Vercel/Cloudflare)

---

## 9. 검증 지표 (개인 사이드 프로젝트 관점)

### 1차 검증 (Week 1~2)
- 본인이 분석 결과 보고 책 구매/대출 결정에 도움이 되는가?
- 분석 결과가 "다른 곳에서 못 보는 정보"인가?

### 2차 검증 (Week 4 이후)
- 본인이 매주 1회 이상 사이트에 들어와서 책 등록/관리하는가?
- 분석 품질이 시간이 지나도 일관되게 유지되는가? (프롬프트 회귀 없는지)

### 공개 후 (선택)
- 분석 페이지 트래픽 (SEO 검증)
- 가입자 수, 등록 책 수
- 단, 이건 보너스. **본인이 매일 쓰는 도구**가 됐다면 이미 성공.

---

## 10. 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 분석 품질이 낮음 (LLM hallucination) | 신뢰도 붕괴 | 프롬프트에서 "자료 없으면 모른다" 강제, 출처 URL 필수 |
| 네이버 블로그 후기가 마케팅성 글 | 분석 노이즈 | insane-search 결과 후처리 필터, 후기 품질 평가 단계 추가 |
| 책 정보 자동 fetch 실패 | UX 마찰 | 수동 입력 fallback |
| Claude scheduled 비용/시간 | 운영 부담 | 1회 5권 제한, 책 한 권당 토큰/시간 모니터링 |
| 알라딘 등 사이트 ToS / 크롤링 회색지대 | 법적 리스크 | 직접 크롤링 대신 검색 + LLM 요약 방식 사용 |
| 본인 동기 떨어짐 | 프로젝트 중단 | Week 1 검증 단계에서 가치 확인 → 가치 없으면 빠르게 중단 |

---

## 11. 결정 보류 (나중에 정할 것)

- 분야(category) 분류 체계: 처음엔 자유 입력, 데이터 쌓이면 표준화
- 분석 결과 재생성 정책: 책 정보가 업데이트되면 재분석? 사용자가 트리거?
- 공개 vs 비공개 책 구분: 본인만 보는 분석을 만들 수 있게 할지
- 분석 결과 공유 (퍼머링크, OG 이미지): v2

---

## 12. 첫 작업 제안 (Claude Code에서 바로 시작)

1. Supabase 프로젝트 만들고 위 스키마 적용
2. `~/scripts/chaeksalpi-analyze.md` 작업 정의 파일 작성
3. 책 1권 (예: 최근 관심 책) 수동 INSERT
4. Claude Code에서 작업 정의 파일 읽고 그 책 1권만 처리해보기
5. 결과물 보고 프롬프트 튜닝
