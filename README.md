# 책살피

AI 기반 도서 큐레이션 & 평가 서비스.

> 살까 말까 망설이는 순간에 별점/리뷰 요약이 아니라, 4가지 관점(누구에게 좋은가 / 비슷한 책과의 차이 / 약점 / 읽는 비용)으로 정리한 메타 정보를 제공합니다.

상세 기획은 [docs/PRD.md](docs/PRD.md) 참고.

---

## 스택

- **Frontend**: Astro 6 + Tailwind CSS 4
- **DB / Auth**: Supabase
- **분석 워커**: Claude Code + scheduled (`scripts/chaeksalpi-analyze.md`)
- **패키지 매니저**: pnpm (`packageManager` 필드 고정)

## 디렉토리 구조

```
.
├── docs/PRD.md                     # 제품 요구사항
├── scripts/
│   └── chaeksalpi-analyze.md       # Claude scheduled가 호출하는 분석 워커 정의
├── src/
│   ├── layouts/BaseLayout.astro
│   ├── lib/
│   │   ├── database.types.ts       # Supabase 스키마 타입 (수기, 후에 자동 생성으로 교체)
│   │   └── supabase.ts             # 브라우저용 + service-role 클라이언트
│   ├── pages/index.astro
│   └── styles/global.css
├── supabase/
│   └── migrations/0001_init.sql    # 'chaeksalpi' schema + 초기 테이블 + RLS
├── .mcp.json                       # Supabase MCP 등록 (stockontext와 동일 패턴)
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Supabase 구성

`stockontext`와 **동일한 Supabase 프로젝트**를 공유합니다. 테이블 이름 충돌(특히 `analyses`)을 피하기 위해 책살피 테이블은 모두 `chaeksalpi` schema 아래에 둡니다.

- MCP: `.mcp.json`에 `https://mcp.supabase.com/mcp` 등록 (stockontext와 동일 패턴)
- 클라이언트: `createClient<Database, "chaeksalpi">(url, key, { db: { schema: "chaeksalpi" } })`로 기본 schema 고정

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

> 부모 디렉토리에 `packageManager` 필드가 있을 수 있어서, 반드시 이 디렉토리 안에서 실행하세요.

### 2. 환경 변수

```bash
cp .env.example .env
```

`stockontext/.env.local`의 Supabase URL / anon key / service role key를 동일하게 채웁니다 (key 이름은 `PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY`로 변환).

### 3. DB 스키마 적용

```bash
# 옵션 A: Supabase Studio SQL Editor에 supabase/migrations/0001_init.sql 붙여넣고 실행
# 옵션 B: supabase CLI
supabase db push
```

적용 후 **Project Settings → API → "Exposed schemas"**에 `chaeksalpi`를 추가해야 PostgREST/JS 클라이언트가 접근할 수 있습니다.

### 4. 개발 서버

```bash
pnpm dev
```

## 검증 명령

```bash
pnpm check     # astro check (타입 + Astro 진단)
pnpm lint      # prettier --check
pnpm build     # production build
```

## 분석 워커 실행

`scripts/chaeksalpi-analyze.md`를 Claude Code에서 열어 그대로 따라하거나, Claude scheduled에 등록해 매일 새벽 자동 실행. 자세한 절차는 해당 파일 참고.

## 배포

`astro.config.mjs`는 환경변수 `VERCEL`로 어댑터를 자동 분기합니다.

- 로컬/Docker/셀프호스팅: `@astrojs/node` (standalone, `dist/server/entry.mjs`)
- Vercel: `@astrojs/vercel` (Vercel이 빌드 시 `VERCEL=1` 자동 주입)

### Vercel 배포 단계

1. **프로젝트 생성**: Vercel 대시보드 → New Project → 이 GitHub 저장소 import
2. **Build & Output Settings**:
   - Framework Preset: Astro
   - Build Command: `pnpm build`
   - Output Directory: 비워두기 (어댑터가 처리)
3. **환경 변수**: `.env.example`의 모든 키를 Vercel Project Settings → Environment Variables에 동일하게 설정. 특히 `PUBLIC_SITE_URL`은 실제 배포 도메인으로 변경.
4. **Supabase Auth Redirect URLs**: Supabase Dashboard → Authentication → URL Configuration에 배포 도메인 추가 (`https://<your-domain>/api/auth/callback`).
5. **Deploy** → 첫 빌드 후 동작 확인.

### 셀프호스팅 (Docker / VM)

```bash
pnpm build
node dist/server/entry.mjs   # 기본 4321 포트
```

PM2/systemd로 데몬 관리. 환경변수는 `.env`로.

### 분석 워커와의 연결

분석 워커는 Claude Code 로컬 환경에서 cron으로 실행되며, 같은 Supabase 프로젝트(`chaeksalpi` 스키마)에 결과를 INSERT합니다. 즉 웹 앱 배포와 워커 인프라는 **분리**되어 있습니다 — 웹은 Vercel/셀프호스팅, 워커는 본인 머신의 Claude scheduled.

## 마일스톤 (PRD §8 요약)

- **Week 1**: 분석 파이프라인 검증 (UI 없이, 책 2~3권 수동 분석)
- **Week 2**: Claude scheduled 자동화
- **Week 3-4**: Astro UI (등록/목록/상세/책장)
- **Week 5+**: SEO, 모바일, 배포
