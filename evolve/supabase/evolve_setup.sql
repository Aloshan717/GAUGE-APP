-- ═══════════════════════════════════════════════════════════════════════════
-- Evolve · database setup
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run more than once. Nothing existing is deleted or changed in place.
--
-- Evolve uses the same Supabase project as Gauge, so weigh-ins, InBody scans,
-- measurements, goals and lifts are already there — nothing to import.
-- This file only adds what Evolve needs on top:
--   ev_profiles  — sex, age, height and training answers (asked once)
--   ev_days      — calories and protein eaten, and burn, one row per day
--   ev_plans     — the training plan you approved
--   ev_sync_burn — lets your iPhone Shortcut send Apple Watch burn
-- Every row is private to its owner (row level security).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Gauge columns, in case an older migration was never run ──────────────────
alter table public.goals        add column if not exists start_date date;
alter table public.goals        add column if not exists goal_type text;
alter table public.goals        add column if not exists target_muscle_kg numeric;
alter table public.sessions     add column if not exists day_kcal integer;
alter table public.inbody_scans add column if not exists smm_kg numeric;

update public.inbody_scans
   set smm_kg = round((weight * muscle_mass / 100)::numeric, 1)
 where smm_kg is null and weight is not null and muscle_mass is not null;

update public.goals
   set target_muscle_kg = round((target_weight * target_muscle / 100)::numeric, 1)
 where target_muscle_kg is null and target_muscle is not null and target_weight is not null;

-- ── Lifts: how hard each set felt, and which library exercise it was ─────────
alter table public.workout_logs add column if not exists effort text;        -- easy | ok | hard
alter table public.workout_logs add column if not exists exercise_id text;   -- Evolve library id
alter table public.workout_logs add column if not exists set_no integer;
-- Saved sets can be corrected (Evolve also works without this: it re-saves the set).
drop policy if exists "workout_logs update own" on public.workout_logs;
create policy "workout_logs update own" on public.workout_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Profile ──────────────────────────────────────────────────────────────────
create table if not exists public.ev_profiles (
  user_id        uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name   text,
  sex            text check (sex in ('m', 'f')),
  birth_year     integer check (birth_year between 1900 and 2100),
  height_cm      numeric check (height_cm between 100 and 250),
  activity       text,      -- sit | feet | job
  experience     text,      -- new | mid | adv
  train_days     integer[], -- weekdays, 0 = Sunday … 6 = Saturday
  session_min    integer,
  equipment      text,      -- gym | home | bw
  focus          text,      -- muscle | strength | mix
  pain           text[] not null default '{}',
  cardio         text,      -- none | c2 | c3
  lang           text,
  theme          text,
  sync_key_hash  text unique,   -- SHA-256 of the Apple Watch Shortcut key (the key itself is never stored)
  updated_at     timestamptz not null default now()
);
alter table public.ev_profiles enable row level security;
drop policy if exists "ev_profiles own" on public.ev_profiles;
create policy "ev_profiles own" on public.ev_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Daily fuel and burn ──────────────────────────────────────────────────────
create table if not exists public.ev_days (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date         date not null,
  kcal_in      integer check (kcal_in between 0 and 20000),
  protein_g    integer check (protein_g between 0 and 1000),
  burn_kcal    integer check (burn_kcal between 0 and 15000),
  burn_source  text,          -- watch | manual
  updated_at   timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.ev_days enable row level security;
drop policy if exists "ev_days own" on public.ev_days;
create policy "ev_days own" on public.ev_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Training plan ────────────────────────────────────────────────────────────
create table if not exists public.ev_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  active      boolean not null default true,
  answers     jsonb,
  plan        jsonb not null
);
create index if not exists ev_plans_user_idx on public.ev_plans (user_id, created_at desc);
alter table public.ev_plans enable row level security;
drop policy if exists "ev_plans own" on public.ev_plans;
create policy "ev_plans own" on public.ev_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Apple Watch burn from the iPhone Shortcut ────────────────────────────────
-- The Shortcut has no login, so it sends a personal key instead. Only the
-- SHA-256 of that key is stored; the function finds its owner and saves that
-- day's Active + Resting energy. It can write nothing else.
create or replace function public.ev_sync_burn(p_key text, p_date date, p_active numeric, p_resting numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid;
  total integer;
begin
  if p_key is null or length(p_key) < 20 then
    raise exception 'invalid key' using errcode = '28000';
  end if;
  select user_id into uid
    from public.ev_profiles
   where sync_key_hash = encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  if uid is null then
    raise exception 'invalid key' using errcode = '28000';
  end if;
  if p_date is null or p_date > current_date + 1 or p_date < current_date - 30 then
    raise exception 'date out of range' using errcode = '22008';
  end if;
  total := round(coalesce(p_active, 0) + coalesce(p_resting, 0));
  if total < 300 or total > 12000 then
    raise exception 'burn out of range' using errcode = '22003';
  end if;
  insert into public.ev_days (user_id, date, burn_kcal, burn_source, updated_at)
       values (uid, p_date, total, 'watch', now())
  on conflict (user_id, date)
  do update set burn_kcal = excluded.burn_kcal, burn_source = 'watch', updated_at = now();
  return json_build_object('ok', true, 'date', p_date, 'kcal', total);
end
$$;
revoke all on function public.ev_sync_burn(text, date, numeric, numeric) from public;
grant execute on function public.ev_sync_burn(text, date, numeric, numeric) to anon, authenticated;

-- Make the API see the new tables and columns immediately.
notify pgrst, 'reload schema';
