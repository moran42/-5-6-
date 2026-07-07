-- Supabase SQL Editor에서 이 파일 내용을 한 번 실행하세요.

create table if not exists trip_data (
  trip_id text primary key,
  payload jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table trip_data enable row level security;

drop policy if exists "trip read" on trip_data;
drop policy if exists "trip insert" on trip_data;
drop policy if exists "trip update" on trip_data;

create policy "trip read" on trip_data for select using (true);
create policy "trip insert" on trip_data for insert with check (true);
create policy "trip update" on trip_data for update using (true);
