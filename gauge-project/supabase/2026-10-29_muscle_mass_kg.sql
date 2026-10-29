-- Gauge · 2026-10-29 · Muscle Mass in kg
-- Run once in Supabase → SQL Editor. Safe to run more than once.
-- The app works before this is run (it rebuilds kg from the stored %), but
-- running it keeps the exact kg printed on each InBody sheet from now on.

-- InBody scans: Skeletal Muscle Mass in kg, as printed on the sheet.
alter table public.inbody_scans add column if not exists smm_kg numeric;

-- Goals: muscle target in kg.
alter table public.goals add column if not exists target_muscle_kg numeric;

-- Existing scans: fill kg from the stored % and the scan's weight.
update public.inbody_scans
   set smm_kg = round((weight * muscle_mass / 100)::numeric, 1)
 where smm_kg is null and weight is not null and muscle_mass is not null;

-- Existing goals with a % muscle target and a target weight: fill the kg target.
update public.goals
   set target_muscle_kg = round((target_weight * target_muscle / 100)::numeric, 1)
 where target_muscle_kg is null and target_muscle is not null and target_weight is not null;

-- Make the API see the new columns immediately.
notify pgrst, 'reload schema';
