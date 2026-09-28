-- Gauge · 2026-09-28
-- Run once in Supabase → SQL Editor BEFORE deploying the matching app version.
-- Safe to run more than once. Existing rows and RLS policies are untouched.

-- Goal: its own start date (pace is measured from here) and goal type
-- (cut / build / recomp) that drives the InBody coach.
alter table public.goals    add column if not exists start_date date;
alter table public.goals    add column if not exists goal_type  text;

-- Session: whole-day energy burned (Apple Watch active + resting), in kcal.
-- The old `kcal` column (workout-only calories) is kept for history.
alter table public.sessions add column if not exists day_kcal integer;

-- Make the API see the new columns immediately.
notify pgrst, 'reload schema';
