create table if not exists public.user_app_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  data_key text not null check (char_length(data_key) between 1 and 200),
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, data_key)
);

alter table public.user_app_data enable row level security;

drop policy if exists "Users can read their own app data" on public.user_app_data;
create policy "Users can read their own app data"
  on public.user_app_data
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own app data" on public.user_app_data;
create policy "Users can insert their own app data"
  on public.user_app_data
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own app data" on public.user_app_data;
create policy "Users can update their own app data"
  on public.user_app_data
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.user_app_data to authenticated;
