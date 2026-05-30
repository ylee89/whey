
-- Enums
create type public.activity_level as enum ('sedentary','light','moderate','active','very_active');
create type public.goal_type as enum ('cut','maintain','bulk');
create type public.sex_type as enum ('male','female','other');
create type public.friendship_status as enum ('pending','accepted');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  sex public.sex_type,
  weight_kg numeric,
  height_cm numeric,
  age int,
  activity_level public.activity_level,
  goal_type public.goal_type,
  protein_goal_g numeric not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- Friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

grant select, insert, update, delete on public.friendships to authenticated;
grant all on public.friendships to service_role;

alter table public.friendships enable row level security;

create policy "users read own friendships"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users send friend requests"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "users update friendships they are part of"
  on public.friendships for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "users delete friendships they are part of"
  on public.friendships for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Helper to check accepted friendship
create or replace function public.are_friends(_a uuid, _b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = _a and addressee_id = _b)
        or (requester_id = _b and addressee_id = _a))
  );
$$;

-- Food logs
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_name text not null,
  protein_g numeric not null check (protein_g >= 0),
  quantity text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index food_logs_user_logged_at_idx on public.food_logs (user_id, logged_at desc);

grant select, insert, update, delete on public.food_logs to authenticated;
grant all on public.food_logs to service_role;

alter table public.food_logs enable row level security;

create policy "users read own logs or friends logs"
  on public.food_logs for select to authenticated
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
  );

create policy "users insert own logs"
  on public.food_logs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users update own logs"
  on public.food_logs for update to authenticated
  using (auth.uid() = user_id);

create policy "users delete own logs"
  on public.food_logs for delete to authenticated
  using (auth.uid() = user_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name',
             split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger friendships_updated_at before update on public.friendships
  for each row execute function public.set_updated_at();
