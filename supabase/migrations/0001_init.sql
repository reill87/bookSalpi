-- 책살피 초기 스키마
-- PRD §6 참고. stockontext와 같은 Supabase 프로젝트를 공유하므로
-- public 충돌(특히 `analyses`)을 피하기 위해 별도 `chaeksalpi` schema 사용.
--
-- 적용 후 Supabase 대시보드 → Project Settings → API → "Exposed schemas"에
-- `chaeksalpi`를 추가해야 PostgREST/JS 클라이언트가 접근할 수 있습니다.

create schema if not exists chaeksalpi;

-- ===========================
-- Tables
-- ===========================

create table if not exists chaeksalpi.books (
  id uuid primary key default gen_random_uuid(),
  isbn text unique,
  title text not null,
  author text,
  publisher text,
  published_date date,
  cover_url text,
  description text,
  toc text,
  source_url text,
  category text,
  status text not null default 'pending'
    check (status in ('pending', 'analyzing', 'done', 'failed')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_status_idx
  on chaeksalpi.books(status);
create index if not exists books_created_at_idx
  on chaeksalpi.books(created_at desc);

create table if not exists chaeksalpi.analyses (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references chaeksalpi.books(id) on delete cascade,
  target_reader text,
  similar_books jsonb,
  weaknesses text,
  reading_cost jsonb,
  raw_sources jsonb,
  model_version text not null,
  prompt_version text not null,
  generated_at timestamptz not null default now(),
  unique (book_id, model_version, prompt_version)
);

create index if not exists analyses_book_id_idx
  on chaeksalpi.analyses(book_id);

create table if not exists chaeksalpi.user_picks (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references chaeksalpi.books(id) on delete cascade,
  status text not null check (status in ('wishlist', 'reading', 'read')),
  personal_note text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create table if not exists chaeksalpi.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references chaeksalpi.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text check (status in ('success', 'failed')),
  error_log text
);

create index if not exists analysis_jobs_book_id_idx
  on chaeksalpi.analysis_jobs(book_id);

-- ===========================
-- Trigger: keep updated_at fresh
-- ===========================

create or replace function chaeksalpi.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on chaeksalpi.books;
create trigger books_set_updated_at
  before update on chaeksalpi.books
  for each row execute function chaeksalpi.set_updated_at();

drop trigger if exists user_picks_set_updated_at on chaeksalpi.user_picks;
create trigger user_picks_set_updated_at
  before update on chaeksalpi.user_picks
  for each row execute function chaeksalpi.set_updated_at();

-- ===========================
-- RLS
-- ===========================

alter table chaeksalpi.books enable row level security;
alter table chaeksalpi.analyses enable row level security;
alter table chaeksalpi.user_picks enable row level security;
alter table chaeksalpi.analysis_jobs enable row level security;

-- books: 누구나 read, 로그인 사용자만 insert, 등록자만 update.
drop policy if exists books_read_all on chaeksalpi.books;
create policy books_read_all on chaeksalpi.books
  for select using (true);

drop policy if exists books_insert_authenticated on chaeksalpi.books;
create policy books_insert_authenticated on chaeksalpi.books
  for insert to authenticated
  with check (added_by = auth.uid());

drop policy if exists books_update_owner on chaeksalpi.books;
create policy books_update_owner on chaeksalpi.books
  for update to authenticated
  using (added_by = auth.uid())
  with check (added_by = auth.uid());

-- analyses: 누구나 read. write 는 service_role 전용 (RLS bypass).
drop policy if exists analyses_read_all on chaeksalpi.analyses;
create policy analyses_read_all on chaeksalpi.analyses
  for select using (true);

-- user_picks: 본인만 read/write.
drop policy if exists user_picks_self_select on chaeksalpi.user_picks;
create policy user_picks_self_select on chaeksalpi.user_picks
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_picks_self_modify on chaeksalpi.user_picks;
create policy user_picks_self_modify on chaeksalpi.user_picks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- analysis_jobs: 본인이 등록한 책의 작업 로그만 read. write 는 service_role.
drop policy if exists analysis_jobs_read_owner on chaeksalpi.analysis_jobs;
create policy analysis_jobs_read_owner on chaeksalpi.analysis_jobs
  for select to authenticated
  using (
    exists (
      select 1 from chaeksalpi.books b
      where b.id = analysis_jobs.book_id
        and b.added_by = auth.uid()
    )
  );

-- ===========================
-- Schema 권한
-- ===========================
-- 인증/익명 역할이 schema를 조회할 수 있도록 USAGE 권한 부여.
-- 테이블별 권한은 RLS 정책으로 통제됨.

grant usage on schema chaeksalpi to anon, authenticated, service_role;
grant select on all tables in schema chaeksalpi to anon, authenticated;
grant insert, update, delete on chaeksalpi.books, chaeksalpi.user_picks
  to authenticated;
grant all on all tables in schema chaeksalpi to service_role;
